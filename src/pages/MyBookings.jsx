import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyBooking, updateBooking } from '@/api/bookings';
import { getEvent } from '@/api/events';
import { getPlace } from '@/api/places';
import { getEventImage, getSpaceImage } from '@/lib/listingImages';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

// Extract event title from "Booking for {title}" notes as fallback
function titleFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null;
  const prefix = 'Booking for ';
  if (notes.startsWith(prefix)) return notes.slice(prefix.length).trim();
  return null;
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-green-100 text-green-800',
    waitlist: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-stone-100 text-stone-600',
  };
  const labels = { pending: 'Pending', confirmed: 'Confirmed', waitlist: 'Waitlist', cancelled: 'Cancelled' };
  const style = styles[status] || styles.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {labels[status] || status}
    </span>
  );
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function isUpcoming(startAt) {
  if (!startAt) return false;
  return new Date(startAt) >= new Date();
}

const GROUP_OPTIONS = [
  { value: 'time', label: 'Time' },
  { value: 'community', label: 'Community' },
  { value: 'place', label: 'Place' },
  { value: 'host', label: 'Host' },
];

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [details, setDetails] = useState({}); // listingId -> { title, placeTitle, communityId, communityName, communitySlug, creatorName }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupBy, setGroupBy] = useState('time');
  const [filterCommunityId, setFilterCommunityId] = useState(null); // null = all
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    getMyBooking()
      .then((data) => {
        const list = data?.bookings ?? data ?? [];
        const arr = Array.isArray(list) ? list : [];
        // Deduplicate: one booking per listing (keep most recent by createdAt)
        const seen = new Map();
        arr.forEach((b) => {
          const key = `${b.listingType}:${b.listingId}`;
          const existing = seen.get(key);
          if (!existing || new Date(b.createdAt || 0) > new Date(existing.createdAt || 0)) {
            seen.set(key, b);
          }
        });
        setBookings(Array.from(seen.values()));
      })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  // Enrich with event/place details (title, community, host, place)
  useEffect(() => {
    if (bookings.length === 0) return;

    const eventIds = [...new Set(bookings.filter((b) => b.listingType === 'event').map((b) => b.listingId))];
    const placeIds = [...new Set(bookings.filter((b) => b.listingType === 'space' || b.listingType === 'place').map((b) => b.listingId))];

    const loadEvents = eventIds.map((id) =>
      getEvent(id)
        .then((res) => {
          const ev = res?.event ?? res;
          if (!ev) return { id, title: null, placeTitle: null, placeAddress: null, communityId: null, communityName: null, communitySlug: null, creatorName: null, placeId: null };
          return {
            id,
            title: ev.title ?? null,
            placeTitle: ev.placeTitle ?? null,
            placeAddress: ev.placeAddress ?? null,
            communityId: ev.communityId ?? ev.community_id ?? null,
            communityName: ev.communityName ?? ev.community_name ?? null,
            communitySlug: ev.communitySlug ?? ev.community_slug ?? null,
            creatorName: ev.creatorName ?? ev.creator_name ?? null,
            placeId: ev.placeId ?? ev.place_id ?? null,
          };
        })
        .catch(() => ({ id, title: null, placeTitle: null, placeAddress: null, communityId: null, communityName: null, communitySlug: null, creatorName: null, placeId: null }))
    );

    const loadPlaces = placeIds.map((id) =>
      getPlace(id)
        .then((res) => {
          const p = res?.place ?? res;
          return {
            id,
            title: p?.title || null,
            placeTitle: null,
            placeAddress: p?.address || null,
            communityName: null,
            communitySlug: null,
            creatorName: null,
          };
        })
        .catch(() => ({ id, title: null, placeTitle: null, placeAddress: null, communityName: null, communitySlug: null, creatorName: null }))
    );

    Promise.all([...loadEvents, ...loadPlaces]).then((results) => {
      const map = {};
      results.forEach((r) => { map[r.id] = r; });
      setDetails(map);
    });
  }, [bookings]);

  // Unique communities from loaded details (for filter dropdown)
  const communityOptions = Object.values(details)
    .filter((d) => d.communityId && d.communityName)
    .reduce((acc, d) => {
      if (!acc.some((c) => c.id === d.communityId)) acc.push({ id: d.communityId, name: d.communityName });
      return acc;
    }, [])
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  // Apply community filter: only event bookings have communityId; venue bookings show when "All" selected
  const filteredBookings =
    filterCommunityId == null
      ? bookings
      : bookings.filter((b) => details[b.listingId]?.communityId === filterCommunityId);

  const getDisplayTitle = (booking) => {
    const info = details[booking.listingId];
    if (info?.title) return info.title;
    const fromNotes = titleFromNotes(booking.notes);
    if (fromNotes) return fromNotes;
    return booking.listingType === 'event' ? 'Event' : 'Venue';
  };

  const handleCancel = async (booking, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Cancel your registration for "${getDisplayTitle(booking)}"?`)) return;
    setCancellingId(booking.id);
    try {
      await updateBooking(booking.id, { status: 'cancelled' });
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const getGroupKey = (booking) => {
    const info = details[booking.listingId];
    if (groupBy === 'time') {
      return isUpcoming(booking.startAt) && booking.status !== 'cancelled' ? 'Upcoming' : 'Past';
    }
    if (groupBy === 'community') {
      return info?.communityName || 'No community';
    }
    if (groupBy === 'place') {
      return info?.placeTitle || info?.placeAddress || 'No venue';
    }
    if (groupBy === 'host') {
      return info?.creatorName || 'Unknown host';
    }
    return 'Other';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-9 bg-stone-200 rounded w-48" />
          <div className="h-10 bg-stone-100 rounded w-64" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3">
          {error}
        </div>
      </div>
    );
  }

  // Group bookings (use filtered list)
  const groups = {};
  filteredBookings.forEach((b) => {
    const key = getGroupKey(b);
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });

  // Sort groups: Time -> Upcoming first, Past second. Others -> alphabetical. Only include non-empty.
  const groupOrder = (groupBy === 'time' ? ['Upcoming', 'Past'] : Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })))
    .filter((k) => groups[k]?.length > 0);
  if (groupBy === 'time') {
    groupOrder.forEach((k) => {
      groups[k]?.sort((a, b) => {
        const aUp = isUpcoming(a.startAt);
        const bUp = isUpcoming(b.startAt);
        if (aUp !== bUp) return aUp ? -1 : 1;
        return new Date(a.startAt || 0) - new Date(b.startAt || 0);
      });
    });
  } else {
    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0));
    });
  }

  const viewHref = (b) =>
    b.listingType === 'event' ? `/listings/event/${b.listingId}` : `/places/${b.listingId}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        My Bookings
      </h1>
      <p className="mt-2 text-stone-600">
        View and manage your event and venue bookings.
      </p>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          message="When you book an event or venue, it will appear here."
          action={
            <Link to="/explore">
              <Button variant="primary">Browse events</Button>
            </Link>
          }
          className="mt-12"
        />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {communityOptions.length > 0 && (
              <>
                <span className="text-sm font-medium text-stone-700">Filter by community:</span>
                <select
                  value={filterCommunityId ?? ''}
                  onChange={(e) => setFilterCommunityId(e.target.value === '' ? null : e.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 focus:border-primary-200 focus:outline-none focus:ring-1 focus:ring-primary-200"
                >
                  <option value="">All communities</option>
                  {communityOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <span className="text-sm font-medium text-stone-700">Group by:</span>
            <div className="flex flex-wrap gap-2">
              {GROUP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGroupBy(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    groupBy === opt.value
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {filterCommunityId != null && filteredBookings.length === 0 && (
            <p className="mt-4 text-sm text-stone-500">
              No bookings in the selected community. Try &quot;All communities&quot; or book an event from that community.
            </p>
          )}

          <div className="mt-8 space-y-8">
            {groupOrder.map((groupKey) => {
              const items = groups[groupKey];
              if (!items || items.length === 0) return null;

              return (
                <section key={groupKey}>
                  <h2 className="text-lg font-semibold text-stone-900 mb-3">{groupKey}</h2>
                  <ul className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden bg-white">
                    {items.map((booking) => {
                      const title = getDisplayTitle(booking);
                      const info = details[booking.listingId];
                      return (
                        <li key={booking.id}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-stone-50 transition-colors">
                            <Link to={viewHref(booking)} className="min-w-0 flex-1">
                              <p className="font-medium text-stone-900 truncate">{title}</p>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0 text-sm text-stone-500">
                                {booking.startAt && (
                                  <span>
                                    {formatDate(booking.startAt)}
                                    {formatTime(booking.startAt) && ` · ${formatTime(booking.startAt)}`}
                                  </span>
                                )}
                                {info?.placeTitle && <span>{info.placeTitle}</span>}
                                {info?.communityName && groupBy !== 'community' && (
                                  <span>{info.communityName}</span>
                                )}
                                {info?.creatorName && groupBy !== 'host' && (
                                  <span>Host: {info.creatorName}</span>
                                )}
                              </div>
                            </Link>
                            <div className="flex items-center gap-3 shrink-0">
                              <StatusBadge status={booking.status} />
                              <Link to={viewHref(booking)} className="text-sm text-primary-200 font-medium">View →</Link>
                              {booking.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  className="text-xs text-red-700 border-red-200 hover:bg-red-50"
                                  onClick={(e) => handleCancel(booking, e)}
                                  disabled={cancellingId === booking.id}
                                >
                                  {cancellingId === booking.id ? 'Cancelling…' : 'Cancel'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
