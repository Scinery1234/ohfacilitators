import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getEventImage } from '@/lib/listingImages';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Get month/year that has the earliest event; fallback to current month */
function getInitialViewMonth(events) {
  const now = new Date();
  let best = { year: now.getFullYear(), month: now.getMonth() };
  let earliest = '';
  events.forEach((e) => {
    const d = e?.date && typeof e.date === 'string' ? e.date : (e?.startAt ? String(e.startAt).slice(0, 10) : '');
    if (d && (!earliest || d < earliest)) earliest = d;
  });
  if (earliest) {
    const [y, m] = earliest.split('-').map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m)) best = { year: y, month: m - 1 };
  }
  return best;
}

export default function EventsCalendar({ events = [] }) {
  const safeEvents = Array.isArray(events) ? events : [];
  const [viewMonth, setViewMonth] = useState(() => getInitialViewMonth(safeEvents));

  const eventsByDate = useMemo(() => {
    const map = {};
    safeEvents.forEach((e) => {
      const dateKey = e?.date && typeof e.date === 'string'
        ? e.date
        : (e?.startAt ? String(e.startAt).slice(0, 10) : '');
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(e);
    });
    return map;
  }, [safeEvents]);

  // When events first load, switch to a month that has events if current month is empty (only once)
  const hasAdjustedRef = useRef(false);
  useEffect(() => {
    if (safeEvents.length === 0 || hasAdjustedRef.current) return;
    const prefix = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}`;
    const hasAnyInView = safeEvents.some((e) => {
      const d = e?.date || (e?.startAt ? String(e.startAt).slice(0, 10) : '');
      return d && d.startsWith(prefix);
    });
    if (!hasAnyInView) {
      hasAdjustedRef.current = true;
      setViewMonth(getInitialViewMonth(safeEvents));
    }
  }, [safeEvents, viewMonth.year, viewMonth.month]);

  const { year, month } = viewMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, dateStr, dayEvents: eventsByDate[dateStr] || [] });
  }

  const goPrev = () => {
    if (month === 0) setViewMonth({ year: year - 1, month: 11 });
    else setViewMonth({ year, month: month - 1 });
  };

  const goNext = () => {
    if (month === 11) setViewMonth({ year: year + 1, month: 0 });
    else setViewMonth({ year, month: month + 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-stone-900">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center min-w-0 overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1 sm:py-2 text-[10px] sm:text-xs font-medium text-stone-500 truncate">
            {d}
          </div>
        ))}
        {days.map((cell, i) => (
          <div
            key={i}
            className={`min-h-[48px] sm:min-h-[60px] rounded p-1 sm:p-2 border ${
              cell ? 'border-stone-200 bg-white' : 'border-transparent'
            }`}
          >
            {cell && (
              <>
                <span className="text-xs sm:text-sm font-medium text-stone-700">{cell.day}</span>
                {cell.dayEvents.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {cell.dayEvents.map((ev) => (
                      <Link
                        key={ev.id}
                        to={`/listings/event/${ev.id}`}
                        className="block text-left text-xs truncate rounded px-1.5 py-0.5 bg-primary-200/20 text-primary-200 font-medium hover:bg-primary-200/30 transition-colors"
                        title={ev.title}
                      >
                        {ev.title}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Upcoming events list */}
      <div className="mt-8">
        <h3 className="font-display text-lg font-semibold text-stone-900 mb-4">Upcoming events</h3>
        <div className="space-y-3">
          {safeEvents
            .filter((e) => e?.date)
            .slice()
            .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''))
            .slice(0, 8)
            .map((event) => (
              <Link
                key={event.id}
                to={`/listings/event/${event.id}`}
                className="flex gap-4 rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all"
              >
                <div className="w-20 shrink-0 aspect-video rounded-lg overflow-hidden bg-stone-200">
                  <img src={getEventImage(event)} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 truncate">{event.title}</p>
                  <p className="text-sm text-stone-500">
                    {event.date}{event.time ? ` · ${event.time}` : ''}{(event.locationArea || event.location) ? ` · ${event.locationArea || event.location}` : ''}
                  </p>
                  {event.price != null && (
                    <p className="text-sm font-medium text-stone-700">${event.price}{event.price === 0 ? '' : ' / person'}</p>
                  )}
                </div>
              </Link>
            ))}
        </div>
        {safeEvents.length === 0 && <p className="text-stone-500 py-4">No upcoming events.</p>}
      </div>
    </div>
  );
}
