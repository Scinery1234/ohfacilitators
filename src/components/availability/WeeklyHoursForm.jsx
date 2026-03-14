/**
 * WeeklyHoursForm – Recurring weekly availability using 4 segments per day.
 * Morning 6–10, Midday 10–2, Afternoon 2–6, Evening 6–10.
 */

import { useState, useEffect } from 'react';
import {
  getVenueAvailability,
  getUserAvailability,
  createAvailabilitySlot,
  deleteAvailabilitySlot,
} from '@/api/availability-unified';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DAY_SEGMENTS } from '@/lib/availabilitySegments';

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function WeeklyHoursForm({ venueId, ownerType, ownerId, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [selectedSegments, setSelectedSegments] = useState(new Set());

  const isUser = ownerType === 'USER' && ownerId;
  const resourceId = isUser ? ownerId : venueId;

  useEffect(() => {
    if (!resourceId) return;
    load();
  }, [resourceId, ownerType]);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const { slots } = isUser
        ? await getUserAvailability(ownerId)
        : await getVenueAvailability(venueId);
      const recurring = (slots || []).filter((s) => s.date == null);
      const days = new Set();
      const segs = new Set();
      recurring.forEach((s) => {
        days.add(s.dayOfWeek);
        const seg = DAY_SEGMENTS.find(
          (d) => d.start === (s.startTime?.slice(0, 5)) && d.end === (s.endTime?.slice(0, 5))
        );
        if (seg) segs.add(seg.id);
      });
      setSelectedDays(days);
      setSelectedSegments(segs);
    } catch (err) {
      setError(err?.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }

  const toggleDay = (day) => {
    setError('');
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleSegment = (segId) => {
    setError('');
    setSelectedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(segId)) next.delete(segId);
      else next.add(segId);
      return next;
    });
  };

  const selectWeekdays = () => {
    setError('');
    setSelectedDays(new Set([1, 2, 3, 4, 5]));
  };
  const selectAllDays = () => {
    setError('');
    setSelectedDays(new Set([0, 1, 2, 3, 4, 5, 6]));
  };
  const clearDays = () => {
    setError('');
    setSelectedDays(new Set());
  };
  const selectAllSegments = () => {
    setError('');
    setSelectedSegments(new Set(DAY_SEGMENTS.map((s) => s.id)));
  };
  const clearSegments = () => {
    setError('');
    setSelectedSegments(new Set());
  };

  const handleSave = async () => {
    if (!resourceId) return;
    if (selectedDays.size === 0) {
      setError('Select at least one day');
      return;
    }
    if (selectedSegments.size === 0) {
      setError('Select at least one segment (Morning, Midday, Afternoon, or Evening)');
      return;
    }

    const type = isUser ? 'USER' : 'VENUE';
    const id = isUser ? ownerId : venueId;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const loadData = isUser ? await getUserAvailability(ownerId) : await getVenueAvailability(venueId);
      const recurring = (loadData.slots || []).filter((s) => s.date == null);

      for (const slot of recurring) {
        await deleteAvailabilitySlot(slot.id);
      }

      for (const day of selectedDays) {
        for (const seg of DAY_SEGMENTS) {
          if (!selectedSegments.has(seg.id)) continue;
          await createAvailabilitySlot({
            ownerType: type,
            ownerId: id,
            dayOfWeek: day,
            date: null,
            period: 'CUSTOM',
            startTime: seg.start,
            endTime: seg.end,
            status: 'AVAILABLE',
          });
        }
      }

      setSuccess(isUser ? 'Your schedule saved' : 'Default hours saved');
      setTimeout(() => setSuccess(''), 3000);
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="py-6 text-center text-stone-500 text-sm">Loading default hours…</div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <h2 className="text-lg font-semibold text-stone-900 tracking-tight mb-0.5">Working hours</h2>
      <p className="text-sm text-stone-500 mb-4">
        Pick days and which segments are available each week. Use date overrides below to block or open specific dates.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-800 border border-rose-200/80" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 border border-emerald-200/80" role="status">
          {success}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wide mr-1">Days</span>
        <button type="button" onClick={selectWeekdays} className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50">Weekdays</button>
        <button type="button" onClick={selectAllDays} className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50">All days</button>
        <button type="button" onClick={clearDays} className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50">Clear</button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Select days">
        {DAYS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => toggleDay(value)}
            aria-pressed={selectedDays.has(value)}
            className={`h-9 min-w-[2.5rem] rounded-md text-sm font-medium transition-colors ${
              selectedDays.has(value)
                ? 'bg-stone-800 text-white border border-stone-800'
                : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wide mr-1">Segments</span>
        <button type="button" onClick={selectAllSegments} className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50">All</button>
        <button type="button" onClick={clearSegments} className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50">None</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Select segments">
        {DAY_SEGMENTS.map((seg) => (
          <button
            key={seg.id}
            type="button"
            onClick={() => toggleSegment(seg.id)}
            aria-pressed={selectedSegments.has(seg.id)}
            className={`h-9 rounded-md px-3 text-sm font-medium transition-colors border ${
              selectedSegments.has(seg.id)
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            {seg.label} <span className="opacity-80">({seg.short})</span>
          </button>
        ))}
      </div>

      <Button onClick={handleSave} variant="primary" disabled={saving} className="h-9">
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </Card>
  );
}
