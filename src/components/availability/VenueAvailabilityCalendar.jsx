/**
 * VenueAvailabilityCalendar – Month calendar for venue managers.
 * Day panel (inline) for Block / Open this day; Block date range.
 */

import { useState, useEffect } from 'react';
import {
  getVenueAvailability,
  getUserAvailability,
  getVenueAvailabilitySlots,
  getUserAvailabilitySlots,
  getVenueAvailabilityByWindow,
  getUserAvailabilityByWindow,
  createAvailabilitySlot,
  createAvailabilityOverride,
  deleteAvailabilitySlot,
  deleteAvailabilityOverride,
} from '@/api/availability-unified';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DAY_SEGMENTS, formatEffectiveSegments } from '@/lib/availabilitySegments';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIMELINE_START = 6 * 60;   // 6:00 in minutes
const TIMELINE_END = 22 * 60;    // 22:00 in minutes
const TIMELINE_LEN = TIMELINE_END - TIMELINE_START;

function formatTime12h(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = (timeStr.slice(0, 5) || '00:00').split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function timeToMinutes(t) {
  const s = (t || '00:00').slice(0, 5);
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Subtract blocker ranges from a segment; returns array of remaining sub-segments */
function subtractRanges(segStart, segEnd, blockers) {
  let parts = [{ start: segStart, end: segEnd }];
  for (const b of blockers) {
    const next = [];
    for (const p of parts) {
      if (b.end <= p.start || b.start >= p.end) {
        next.push(p);
      } else {
        if (p.start < b.start) next.push({ start: p.start, end: b.start });
        if (b.end < p.end) next.push({ start: b.end, end: p.end });
      }
    }
    parts = next;
  }
  return parts.filter((p) => p.end > p.start);
}

/** Build timeline segments: effective available (after subtracting blocked/booked), then blocked, booked */
function buildTimelineSegments(recurringSlots, oneOffSlots, overrides) {
  const clamp = (min) => Math.max(TIMELINE_START, Math.min(TIMELINE_END, min));
  const rawAvailable = [];
  recurringSlots.forEach((s) => {
    const start = clamp(timeToMinutes(s.startTime));
    const end = clamp(timeToMinutes(s.endTime));
    if (end > start) rawAvailable.push({ start, end });
  });
  oneOffSlots.forEach((s) => {
    const start = clamp(timeToMinutes(s.startTime));
    const end = clamp(timeToMinutes(s.endTime));
    if (end > start) rawAvailable.push({ start, end });
  });
  const blocked = [];
  const booked = [];
  overrides.forEach((o) => {
    const start = clamp(timeToMinutes(o.startTime));
    const end = clamp(timeToMinutes(o.endTime));
    if (end <= start) return;
    if (o.status === 'BOOKED') booked.push({ start, end });
    else blocked.push({ start, end });
  });
  const blockers = [...blocked, ...booked];
  const available = [];
  rawAvailable.forEach((seg) => {
    available.push(...subtractRanges(seg.start, seg.end, blockers));
  });
  return { available, blocked, booked };
}

/** Time options in chronological order: 12:00 AM, 12:30 AM, ..., 11:30 PM (30-min steps) */
const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push({ value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, label: formatTime12h(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`) });
    }
  }
  return out;
})();

const DEFAULT_END_OFFSET_MINUTES = 120; // 2 hours after start

export default function VenueAvailabilityCalendar({ venueId, ownerType, ownerId, refreshTrigger }) {
  const isUser = ownerType === 'USER' && ownerId;
  const resourceId = isUser ? ownerId : venueId;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [blockRangeFrom, setBlockRangeFrom] = useState('');
  const [blockRangeTo, setBlockRangeTo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [blockRangeSuccess, setBlockRangeSuccess] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [previewSlots, setPreviewSlots] = useState([]);
  const [previewSlotsLoading, setPreviewSlotsLoading] = useState(false);
  const [filterWindowStart, setFilterWindowStart] = useState('09:00');
  const [filterWindowEnd, setFilterWindowEnd] = useState('17:00');
  const [filterMatchingDates, setFilterMatchingDates] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);

  useEffect(() => {
    if (!resourceId) return;
    loadAvailability();
  }, [resourceId, refreshTrigger]);

  useEffect(() => {
    if (!resourceId || !selectedDate) {
      setPreviewSlots([]);
      return;
    }
    const dateStr = selectedDate.toISOString().split('T')[0];
    setPreviewSlotsLoading(true);
    const fetchSlots = isUser
      ? getUserAvailabilitySlots(ownerId, dateStr, { durationMinutes: 60, incrementMinutes: 30 })
      : getVenueAvailabilitySlots(venueId, dateStr, { durationMinutes: 60, incrementMinutes: 30 });
    fetchSlots
      .then((res) => setPreviewSlots(res.slots || []))
      .catch(() => setPreviewSlots([]))
      .finally(() => setPreviewSlotsLoading(false));
  }, [resourceId, isUser, ownerId, venueId, selectedDate, slots, overrides]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = isUser ? await getUserAvailability(ownerId) : await getVenueAvailability(venueId);
      setSlots(data.slots || []);
      setOverrides(data.overrides || []);
    } catch (err) {
      console.error('Failed to load availability:', err);
      setLoadError(err?.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
    return days;
  };

  const getDateStatus = (date) => {
    if (!date) return null;
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const dayOverrides = overrides.filter((o) => o.date === dateStr);
    const fullDayBlocked = dayOverrides.some((o) => o.status === 'BLOCKED' && o.startTime === '00:00' && o.endTime === '23:59');
    const booked = dayOverrides.some((o) => o.status === 'BOOKED');
    const recurringSlots = slots.filter((s) => s.date == null && s.dayOfWeek === dayOfWeek && s.status === 'AVAILABLE');
    const oneOffSlots = slots.filter((s) => s.date === dateStr && s.status === 'AVAILABLE');
    const hasSlots = recurringSlots.length > 0 || oneOffSlots.length > 0;
    const hasPartialBlock = dayOverrides.some((o) => o.status === 'BLOCKED');
    if (fullDayBlocked) return { type: 'blocked', label: 'Blocked' };
    if (booked) return { type: 'booked', label: 'Booked' };
    if (hasSlots) return { type: 'available', label: hasPartialBlock ? 'Available (some blocked)' : 'Available' };
    return { type: 'unavailable', label: 'Not set' };
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const handleDateClick = (date) => {
    if (!date || isPastDate(date)) return;
    setSelectedDate(date);
  };

  const closeDayPanel = () => setSelectedDate(null);

  const getSlotsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const recurring = slots.filter((s) => s.date == null && s.dayOfWeek === dayOfWeek && s.status === 'AVAILABLE');
    const oneOff = slots.filter((s) => s.date === dateStr && s.status === 'AVAILABLE');
    return [...recurring, ...oneOff];
  };

  const getRecurringSlotsForDate = (date) => {
    if (!date) return [];
    const dayOfWeek = date.getDay();
    return slots.filter((s) => s.date == null && s.dayOfWeek === dayOfWeek && s.status === 'AVAILABLE');
  };

  const getOneOffSlotsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return slots.filter((s) => s.date === dateStr && s.status === 'AVAILABLE');
  };

  const getOverridesForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return overrides.filter((o) => o.date === dateStr);
  };

  /** Effective available segments for a date (after subtracting blocked/booked) — for calendar cell label */
  const getEffectiveAvailableForDate = (date) => {
    if (!date) return [];
    const segs = buildTimelineSegments(
      getRecurringSlotsForDate(date),
      getOneOffSlotsForDate(date),
      getOverridesForDate(date)
    );
    return segs.available;
  };

  /** Per-segment status for the selected day (for 4-segment UI) */
  const getSegmentStatus = (segment) => {
    if (!selectedDate) return null;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayOfWeek = selectedDate.getDay();
    const override = overrides.find(
      (o) => o.date === dateStr && o.startTime?.slice(0, 5) === segment.start && o.endTime?.slice(0, 5) === segment.end
    );
    if (override) return { type: override.status === 'BOOKED' ? 'booked' : 'blocked', overrideId: override.id };
    const recurring = slots.find(
      (s) => s.date == null && s.dayOfWeek === dayOfWeek && s.startTime?.slice(0, 5) === segment.start && s.endTime?.slice(0, 5) === segment.end
    );
    if (recurring) return { type: 'available_recurring', slotId: recurring.id };
    const oneOff = slots.find(
      (s) => s.date === dateStr && s.startTime?.slice(0, 5) === segment.start && s.endTime?.slice(0, 5) === segment.end
    );
    if (oneOff) return { type: 'available_oneoff', slotId: oneOff.id };
    return null;
  };

  const handleBlockSegment = async (segment) => {
    if (!selectedDate || !resourceId) return;
    setActionLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { override } = await createAvailabilityOverride({
        ownerType: isUser ? 'USER' : 'VENUE',
        ownerId: resourceId,
        date: dateStr,
        startTime: segment.start,
        endTime: segment.end,
        status: 'BLOCKED',
      });
      setOverrides((prev) => [...prev, override]);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to block');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAvailableSegment = async (segment) => {
    if (!selectedDate || !resourceId) return;
    setActionLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { slot } = await createAvailabilitySlot({
        ownerType: isUser ? 'USER' : 'VENUE',
        ownerId: resourceId,
        date: dateStr,
        dayOfWeek: null,
        period: 'CUSTOM',
        startTime: segment.start,
        endTime: segment.end,
        status: 'AVAILABLE',
      });
      setSlots((prev) => [...prev, slot]);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to add');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockDate = async () => {
    if (!selectedDate || !resourceId) return;
    setActionLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { override } = await createAvailabilityOverride({
        ownerType: isUser ? 'USER' : 'VENUE',
        ownerId: resourceId,
        date: dateStr,
        startTime: '00:00',
        endTime: '23:59',
        status: 'BLOCKED',
      });
      setOverrides((prev) => [...prev, override]);
      closeDayPanel();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to block date');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveOverride = async (overrideId) => {
    if (!resourceId) return;
    setActionLoading(true);
    try {
      await deleteAvailabilityOverride(overrideId);
      setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
    } catch (err) {
      console.error(err);
      alert('Failed to remove block');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveOneOffSlot = async (slotId) => {
    if (!resourceId) return;
    setActionLoading(true);
    try {
      await deleteAvailabilitySlot(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      console.error(err);
      alert('Failed to remove availability window');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFilterByWindow = () => {
    if (!resourceId) return;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const dateTo = new Date(year, month + 1, 0);
    const dateToStr = dateTo.toISOString().split('T')[0];
    const start = filterWindowStart.length === 5 ? filterWindowStart : filterWindowStart.slice(0, 5);
    const end = filterWindowEnd.length === 5 ? filterWindowEnd : filterWindowEnd.slice(0, 5);
    setFilterLoading(true);
    (isUser ? getUserAvailabilityByWindow(ownerId, dateFrom, dateToStr, start, end) : getVenueAvailabilityByWindow(venueId, dateFrom, dateToStr, start, end))
      .then((res) => setFilterMatchingDates(new Set(res.dates || [])))
      .catch(() => setFilterMatchingDates(new Set()))
      .finally(() => setFilterLoading(false));
  };

  const clearFilter = () => setFilterMatchingDates(null);

  const handleBlockRange = async () => {
    if (!resourceId || !blockRangeFrom || !blockRangeTo) return;
    const from = new Date(blockRangeFrom);
    const to = new Date(blockRangeTo);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (from < today) {
      alert('From date cannot be in the past. Use today or a future date.');
      return;
    }
    if (from > to) {
      alert('From date must be on or before To date');
      return;
    }
    setActionLoading(true);
    setBlockRangeSuccess(null);
    try {
      const day = new Date(from);
      let count = 0;
      while (day <= to) {
        const dateStr = day.toISOString().split('T')[0];
        const alreadyBlocked = overrides.some((o) => o.date === dateStr && o.status === 'BLOCKED');
        if (!alreadyBlocked) {
          const { override } = await createAvailabilityOverride({
            ownerType: isUser ? 'USER' : 'VENUE',
            ownerId: resourceId,
            date: dateStr,
            startTime: '00:00',
            endTime: '23:59',
            status: 'BLOCKED',
          });
          setOverrides((prev) => [...prev, override]);
          count++;
        }
        day.setDate(day.getDate() + 1);
      }
      setBlockRangeFrom('');
      setBlockRangeTo('');
      setBlockRangeSuccess(count);
      setTimeout(() => setBlockRangeSuccess(null), 4000);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to block range');
    } finally {
      setActionLoading(false);
    }
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto" />
          <p className="mt-4 text-stone-600 text-sm">Loading calendar…</p>
        </div>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-stone-600 text-sm mb-4">{loadError}</p>
          <Button variant="outline" size="sm" onClick={loadAvailability} disabled={loading}>
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  const days = getDaysInMonth();
  const selectedStatus = selectedDate ? getDateStatus(selectedDate) : null;
  const isBlocked = selectedStatus?.type === 'blocked';
  const hasNoAvailability = slots.length === 0 && overrides.length === 0;

  return (
    <Card className="overflow-hidden">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-stone-900 tracking-tight">Date overrides</h2>
          <p className="text-stone-500 text-sm mt-0.5">Block or open specific dates. Click a day to manage times.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50/50 p-1">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
            className="rounded-md p-2 text-stone-600 hover:bg-white hover:text-stone-900 transition-colors"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(() => new Date())}
            className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white transition-colors"
            title="This month"
          >
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
            className="rounded-md p-2 text-stone-600 hover:bg-white hover:text-stone-900 transition-colors"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {hasNoAvailability && (
        <p className="mb-4 rounded-lg bg-amber-50/80 px-4 py-2.5 text-sm text-amber-800 border border-amber-200/80">
          Set working hours above first, then use this calendar to block or open specific dates.
        </p>
      )}

      {/* Time window filter — compact, same chronological dropdowns */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/30 px-3 py-2">
        <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Filter</span>
        <select
          value={filterWindowStart}
          onChange={(e) => {
            setFilterWindowStart(e.target.value);
            const startMin = timeToMinutes(e.target.value);
            if (timeToMinutes(filterWindowEnd) <= startMin) setFilterWindowEnd(minutesToTime(Math.min(startMin + DEFAULT_END_OFFSET_MINUTES, 24 * 60 - 30)));
          }}
          className="h-8 min-w-[5.5rem] rounded-md border border-stone-200 bg-white pl-2 pr-6 text-sm text-stone-700"
          aria-label="Time window start"
        >
          {TIME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="text-stone-400">–</span>
        <select
          value={filterWindowEnd}
          onChange={(e) => setFilterWindowEnd(e.target.value)}
          className="h-8 min-w-[5.5rem] rounded-md border border-stone-200 bg-white pl-2 pr-6 text-sm text-stone-700"
          aria-label="Time window end"
        >
          {TIME_OPTIONS.filter((opt) => timeToMinutes(opt.value) > timeToMinutes(filterWindowStart)).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleFilterByWindow}
          disabled={filterLoading}
          className="h-8 rounded-md border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {filterLoading ? '…' : 'Apply'}
        </button>
        {filterMatchingDates !== null && (
          <>
            <button type="button" onClick={clearFilter} className="h-8 rounded-md px-2 text-xs text-stone-500 hover:text-stone-700">Clear</button>
            <span className="text-xs text-stone-500">{filterMatchingDates.size} days match</span>
          </>
        )}
      </div>

      {/* Legend — compact, Calendly-style */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-emerald-400/80" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-rose-300/80" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-slate-300" /> Blocked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm border border-stone-200 bg-white" /> Not set
        </span>
        {filterMatchingDates !== null && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm border-2 border-blue-400 bg-blue-50" /> Match
          </span>
        )}
      </div>

      {/* Calendar grid — clean, soft colors */}
      <div className="grid grid-cols-7 gap-px mb-6 rounded-xl border border-stone-200 bg-stone-200 overflow-hidden">
        {DAY_NAMES.map((d) => (
          <div key={d} className="bg-stone-50 py-2 text-center text-xs font-medium text-stone-500">
            {d}
          </div>
        ))}
        {days.map((date, idx) => {
          if (!date) {
            return <div key={idx} className="bg-stone-50 aspect-square min-h-[44px]" aria-hidden="true" />;
          }
          const status = getDateStatus(date);
          const dateStr = date.toISOString().split('T')[0];
          const isFilterMatch = filterMatchingDates !== null && filterMatchingDates.has(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
          const past = isPastDate(date);
          const base = 'flex flex-col items-center justify-center aspect-square min-h-[52px] text-sm font-medium transition-colors py-1 ';
          const available = !past && status?.type === 'available' && 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100';
          const booked = !past && status?.type === 'booked' && 'bg-rose-50 text-rose-800 hover:bg-rose-100';
          const blocked = !past && status?.type === 'blocked' && 'bg-slate-100 text-slate-600 hover:bg-slate-200';
          const unavailable = !past && status?.type === 'unavailable' && 'bg-white text-stone-600 hover:bg-stone-50';
          const pastStyle = past && 'bg-stone-50 text-stone-400 cursor-not-allowed';
          const ring = isToday && 'ring-2 ring-inset ring-stone-400';
          const selected = isSelected && 'ring-2 ring-inset ring-emerald-500';
          const filterRing = isFilterMatch && !isSelected && 'ring-2 ring-inset ring-blue-400';
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={past}
              aria-label={`${date.getDate()} ${MONTH_NAMES[currentMonth.getMonth()]}${past ? ', past' : ''}`}
              className={`${base} ${available || booked || blocked || unavailable || pastStyle} ${ring} ${selected} ${filterRing} flex-col`}
            >
              <span>{date.getDate()}</span>
              {!past && status?.type === 'available' && (() => {
                const effective = getEffectiveAvailableForDate(date);
                const label = formatEffectiveSegments(effective);
                if (!label) return null;
                return <span className="text-[10px] font-normal opacity-90 mt-0.5 leading-tight">{label}</span>;
              })()}
            </button>
          );
        })}
      </div>

      {selectedDate && (() => {
        const timelineSegments = buildTimelineSegments(
          getRecurringSlotsForDate(selectedDate),
          getOneOffSlotsForDate(selectedDate),
          getOverridesForDate(selectedDate)
        );
        const segStyle = (start, end) => ({
          left: `${((start - TIMELINE_START) / TIMELINE_LEN) * 100}%`,
          width: `${((end - start) / TIMELINE_LEN) * 100}%`,
        });
        return (
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="text-base font-semibold text-stone-900">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button
                type="button"
                onClick={closeDayPanel}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Close
              </button>
            </div>

            {/* Calendly-style visual timeline: 6am–10pm */}
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Schedule</p>
              <div className="relative h-10 w-full rounded-lg bg-stone-100 overflow-hidden">
                {timelineSegments.available.map((seg, i) => {
                  const toStr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
                  return (
                    <div
                      key={`av-${i}`}
                      className="absolute top-1 bottom-1 rounded-md bg-emerald-400/90"
                      style={segStyle(seg.start, seg.end)}
                      title={`Available ${formatTime12h(toStr(seg.start))} – ${formatTime12h(toStr(seg.end))}`}
                    />
                  );
                })}
                {timelineSegments.blocked.map((seg, i) => (
                  <div
                    key={`bl-${i}`}
                    className="absolute top-1 bottom-1 rounded-md bg-slate-400/90"
                    style={segStyle(seg.start, seg.end)}
                  />
                ))}
                {timelineSegments.booked.map((seg, i) => (
                  <div
                    key={`bo-${i}`}
                    className="absolute top-1 bottom-1 rounded-md bg-rose-400/90"
                    style={segStyle(seg.start, seg.end)}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-stone-400">
                <span>6:00 AM</span>
                <span>10:00 PM</span>
              </div>
            </div>

            {/* Effective availability summary + 4 segments */}
            <div className="px-5 pb-3">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Available times</p>
              {timelineSegments.available.length > 0 ? (
                <p className="text-sm text-emerald-700 font-medium">{formatEffectiveSegments(timelineSegments.available)}</p>
              ) : (
                <p className="text-sm text-stone-400">No available time on this day. Add a segment below or set working hours above.</p>
              )}
            </div>

            {/* 4 segments: Morning, Midday, Afternoon, Evening */}
            <div className="border-t border-stone-100 px-5 py-4">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Segments</p>
              <div className="space-y-2">
                {DAY_SEGMENTS.map((seg) => {
                  const status = getSegmentStatus(seg);
                  const isAvailable = status?.type === 'available_recurring' || status?.type === 'available_oneoff';
                  const isBlocked = status?.type === 'blocked';
                  const isBooked = status?.type === 'booked';
                  return (
                    <div key={seg.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-800">{seg.label}</span>
                        <span className="text-xs text-stone-500">{seg.short}</span>
                        {isAvailable && (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {status.type === 'available_recurring' ? 'From hours' : 'This day'}
                          </span>
                        )}
                        {isBlocked && <span className="text-xs font-medium text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">Blocked</span>}
                        {isBooked && <span className="text-xs font-medium text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">Booked</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {isBlocked && (
                          <button type="button" onClick={() => handleRemoveOverride(status.overrideId)} disabled={actionLoading} className="text-xs text-slate-600 hover:text-slate-800 underline">Remove</button>
                        )}
                        {status?.type === 'available_oneoff' && (
                          <button type="button" onClick={() => handleRemoveOneOffSlot(status.slotId)} disabled={actionLoading} className="text-xs text-emerald-600 hover:text-emerald-800 underline">Remove</button>
                        )}
                        {!isBlocked && !isBooked && (
                          <button type="button" onClick={() => handleBlockSegment(seg)} disabled={actionLoading} className="h-7 rounded border border-stone-300 bg-white px-2 text-xs font-medium text-stone-700 hover:bg-stone-100">Block</button>
                        )}
                        {!isAvailable && !isBlocked && !isBooked && (
                          <button type="button" onClick={() => handleAddAvailableSegment(seg)} disabled={actionLoading} className="h-7 rounded bg-emerald-600 px-2 text-xs font-medium text-white hover:bg-emerald-700">Add available</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-stone-100 px-5 py-3 flex items-center gap-2">
              <button type="button" onClick={handleBlockDate} disabled={actionLoading} className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2">Block this entire day</button>
            </div>

            {/* Slot preview — clean chips */}
            <div className="border-t border-stone-100 px-5 py-4">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Bookable slots</p>
              {previewSlotsLoading ? (
                <p className="text-sm text-stone-400">Loading…</p>
              ) : previewSlots.length === 0 ? (
                <p className="text-sm text-stone-400">No slots on this day.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {previewSlots.map((slot, i) => (
                    <span key={i} className="inline-flex items-center rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700">
                      {formatTime12h(slot.startTime)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="mt-6 pt-5 border-t border-stone-100">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Block date range</p>
        <p className="text-sm text-stone-500 mb-3">Mark multiple days unavailable (e.g. vacation).</p>
        {blockRangeSuccess !== null && (
          <p className="mb-3 text-sm text-emerald-600 font-medium" role="status">
            {blockRangeSuccess === 0 ? 'No new days blocked.' : `${blockRangeSuccess} day${blockRangeSuccess !== 1 ? 's' : ''} blocked.`}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={blockRangeFrom}
            min={todayStr}
            onChange={(e) => setBlockRangeFrom(e.target.value)}
            className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700"
            aria-label="From date"
          />
          <span className="text-stone-400 text-sm">to</span>
          <input
            type="date"
            value={blockRangeTo}
            min={blockRangeFrom || todayStr}
            onChange={(e) => setBlockRangeTo(e.target.value)}
            className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700"
            aria-label="To date"
          />
          <button
            type="button"
            onClick={handleBlockRange}
            disabled={!blockRangeFrom || !blockRangeTo || actionLoading}
            className="h-9 rounded-md border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {actionLoading ? 'Blocking…' : 'Block range'}
          </button>
        </div>
      </div>
    </Card>
  );
}
