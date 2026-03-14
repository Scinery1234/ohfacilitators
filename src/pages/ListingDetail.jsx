import { useState, useEffect } from 'react';
import { Link, Navigate, useParams, useNavigate, useLoaderData } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getEvent, deleteEvent } from '@/api/events';
import { getMockEventDetail } from '@/mocks/events';
import { getEventImage } from '@/lib/listingImages';
import { createBooking, getMyBooking, updateBooking } from '@/api/bookings';
import Button from '@/components/ui/Button';

// Check if ID looks like a mock ID (e.g., 'event-1') vs UUID
function isMockId(id) {
  return /^(space|event|host|fac|comm)-\d+$/.test(id);
}

export default function ListingDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const loaderData = useLoaderData();
  const { user } = useAuth();
  const [event, setEvent] = useState(() => loaderData?.event ?? null);
  const [loading, setLoading] = useState(!loaderData?.event);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [eventBookings, setEventBookings] = useState([]);

  useEffect(() => {
    if (loaderData?.event && loaderData.event.id === id) {
      setEvent(loaderData.event);
      setLoading(false);
      return;
    }
  }, [loaderData, id]);

  // Load user's existing booking for this event
  useEffect(() => {
    if (!user || !id || type !== 'event') return;
    getMyBooking('mine')
      .then((data) => {
        const bookings = data?.bookings ?? data ?? [];
        const existing = Array.isArray(bookings)
          ? bookings.find((b) => b.listingType === 'event' && b.listingId === id)
          : null;
        if (existing) setBooking(existing);
      })
      .catch(() => {});
  }, [user, id, type]);

  // Load bookings for this event when current user is the host (for confirmation/notification section)
  useEffect(() => {
    if (!user || !event || type !== 'event' || event.createdBy !== user.id) {
      setEventBookings([]);
      return;
    }
    getMyBooking('host')
      .then((data) => {
        const list = data?.bookings ?? data ?? [];
        const forEvent = Array.isArray(list)
          ? list.filter((b) => b.listingType === 'event' && b.listingId === id)
          : [];
        setEventBookings(forEvent);
      })
      .catch(() => setEventBookings([]));
  }, [user, event, id, type, booking]);

  useEffect(() => {
    if (!id || type !== 'event' || loaderData?.event) return;
    setLoading(true);
    setError(null);
    const mock = getMockEventDetail(id);
    if (mock) {
      setEvent(mock.event);
      setLoading(false);
      return;
    }
    getEvent(id)
      .then((data) => setEvent(data.event ?? data))
      .catch((e) => {
        const fallback = getMockEventDetail(id);
        if (fallback) setEvent(fallback.event);
        else setError(e?.response?.data?.message || 'Failed to load event');
      })
      .finally(() => setLoading(false));
  }, [id, type, loaderData?.event]);

  // Spaces (venues) redirect - must be after all hooks to avoid React hooks rule violation
  if (type === 'space') {
    return <Navigate to={`/venues/${id}`} replace />;
  }

  const isRealEvent = !isMockId(id);

  const handleCancelBooking = async () => {
    if (!booking || !user) return;
    if (!window.confirm('Cancel your registration for this event?')) return;
    setCancelling(true);
    try {
      await updateBooking(booking.id, { status: 'cancelled' });
      setBooking(null);
      if (isRealEvent) {
        getEvent(id).then((data) => setEvent(data.event ?? data)).catch(() => {});
      }
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const handleBook = async () => {
    if (!user || !event) return;

    setIsBooking(true);
    setBookingError('');

    try {
      const result = await createBooking({
        listingType: 'event',
        listingId: id,
        hostId: event.createdBy || null,
        startAt: event.startAt || null,
        endAt: event.endAt || null,
        notes: `Booking for ${event.title}`,
        guestName: user?.name || user?.fullName || 'Guest',
      });
      setBooking(result.booking);
      // Refresh event so attendee count updates (works for both real and demo)
      getEvent(id).then((data) => setEvent(data.event ?? data)).catch(() => {});
    } catch (err) {
      setBookingError(err?.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-64 mx-auto" />
          <div className="h-48 bg-stone-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-display font-semibold text-stone-900">Event not found</h1>
        <p className="mt-2 text-stone-600">{error || 'This event may no longer be available.'}</p>
        <Link to="/explore" className="mt-6 inline-block">
          <Button variant="primary">Browse all listings</Button>
        </Link>
      </div>
    );
  }

  const image = getEventImage({ id: event.id, category: 'Event' });
  const item = event;

  // Format date/time from startAt
  const eventDate = event.startAt ? new Date(event.startAt) : null;
  const formattedDate = eventDate ? eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  const formattedTime = eventDate ? eventDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-8">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          ← Back to Explore
        </Link>
        {event.communityName && (
          <>
            <span className="text-stone-300">·</span>
            <span className="text-sm text-stone-500">Community</span>
            <Link
              to={`/communities/${event.communitySlug}`}
              className="text-sm font-medium text-primary-200 hover:text-primary-300 transition-colors"
            >
              {event.communityName}
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        {/* Image */}
        <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm aspect-[4/3] lg:aspect-auto lg:min-h-[400px]">
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        {/* Content */}
        <div>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight">
            {item.title}
          </h1>
          {user?.isAdmin && isRealEvent && (
            <div className="mt-4">
              <Button
                variant="outline"
                className="text-sm text-red-700 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
                  try {
                    await deleteEvent(id);
                    navigate('/explore');
                  } catch (e) {
                    alert(e?.response?.data?.message || 'Failed to delete');
                  }
                }}
              >
                Delete event
              </Button>
            </div>
          )}
          <p className="mt-2 text-stone-600">
            Hosted by{' '}
            <span className="font-medium text-stone-900">
              {event.creatorName || event.creatorEmail || 'Event host'}
            </span>
          </p>

          <p className="mt-6 text-stone-700 leading-relaxed">{item.description}</p>

          {/* At this venue */}
          {event.placeId && (
            <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
              <h3 className="font-semibold text-stone-900 text-sm mb-1">At this venue</h3>
              <Link
                to={`/places/${event.placeId}`}
                className="text-primary-200 hover:text-primary-300 font-medium transition-colors"
              >
                {event.placeTitle || 'View venue'} →
              </Link>
              {event.placeAddress && (
                <p className="text-sm text-stone-500 mt-1">{event.placeAddress}</p>
              )}
            </div>
          )}

          {/* Event-specific */}
          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap gap-4">
              {formattedDate && (
                <span className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-sm font-medium">
                  {formattedDate}{formattedTime ? ` · ${formattedTime}` : ''}
                </span>
              )}
              {event.placeAddress && (
                <span className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-sm font-medium">
                  {event.placeAddress}
                </span>
              )}
              {event.capacity && (
                <span className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-sm font-medium">
                  {event.attendees || 0} / {event.capacity} attendees
                </span>
              )}
            </div>
          </div>

          {/* Attendees (visible to community members) */}
          {event.attendeesList && event.attendeesList.length > 0 && (
            <div className="mt-8 pt-6 border-t border-stone-200">
              <h3 className="font-semibold text-stone-900 text-sm mb-2">Community attendees</h3>
              <p className="text-sm text-stone-500 mb-3">People from your community who are attending</p>
              <div className="flex flex-wrap gap-3">
                {event.attendeesList.map((a) => (
                  <div
                    key={a.userId}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                  >
                    {a.avatarUrl ? (
                      <img
                        src={a.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stone-300 flex items-center justify-center text-stone-600 text-sm font-medium">
                        {(a.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-stone-900">{a.fullName}</span>
                    {user && a.userId !== user.id && (
                      <Link
                        to="/messages"
                        state={{
                          compose: {
                            type: 'dm',
                            otherUserId: a.userId,
                            otherUserName: a.fullName,
                          },
                        }}
                        className="ml-auto text-xs font-medium text-primary-200 hover:text-primary-300 transition-colors"
                      >
                        Message
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Host: booking confirmations / notifications */}
          {user && event.createdBy === user.id && eventBookings.length > 0 && (
            <div className="mt-8 pt-6 border-t border-stone-200">
              <h3 className="font-semibold text-stone-900 text-sm mb-1 flex items-center gap-2">
                Booking confirmations
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary-200 text-primary-800 text-xs font-medium">
                  {eventBookings.length}
                </span>
              </h3>
              <p className="text-sm text-stone-500 mb-3">Recent bookings for this event</p>
              <ul className="space-y-2">
                {eventBookings.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-stone-900">
                      {b.guestName || 'Guest'}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        b.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : b.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {b.status === 'confirmed' ? 'Confirmed' : b.status || 'Pending'}
                    </span>
                    {b.createdAt && (
                      <span className="text-xs text-stone-500">
                        {new Date(b.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact host - for logged-in users (not when user is the host) */}
          {user && event.createdBy && event.createdBy !== user.id && (
            <div className="mt-6">
              <Link
                to="/messages"
                state={{
                  compose: {
                    type: 'contact',
                    recipientUserId: event.createdBy,
                    recipientUserName: event.creatorName || 'Event host',
                    contextType: 'event',
                    contextId: id,
                    contextTitle: event.title,
                    suggestedMessage: `I'm interested in ${event.title} and have a question: `,
                  },
                }}
              >
                <Button variant="outline" className="text-sm">Contact host</Button>
              </Link>
            </div>
          )}

          {/* Communities */}
          {event.communityName && (
            <div className="mt-8 pt-6 border-t border-stone-200">
              <h3 className="font-semibold text-stone-900 text-sm mb-2">Community</h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/communities/${event.communitySlug}`}
                  className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-colors"
                >
                  {event.communityName}
                </Link>
              </div>
            </div>
          )}

          {/* Price & CTA */}
          <div className="mt-10 pt-8 border-t border-stone-200">
            {/* Note: Price field not yet in database schema - remove or add price field */}
            {/* <p className="text-2xl font-semibold text-stone-900">
              ${item.price}
              <span className="text-base font-normal text-stone-500">
                {' / person'}
              </span>
            </p> */}
            {booking ? (
              <div className="mt-6 rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="text-green-800 font-medium mb-2">
                  {booking.status === 'waitlist' ? 'You\'re on the waitlist' : 'Booking confirmed!'}
                </p>
                <p className="text-sm text-green-700">
                  {booking.status === 'waitlist'
                    ? 'This event is full. You\'ll be notified if a spot opens up.'
                    : 'Your booking is pending confirmation. Check your bookings page for updates.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/bookings">
                    <Button variant="secondary" className="text-sm">View my bookings</Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="text-sm text-red-700 border-red-200 hover:bg-red-50"
                    onClick={handleCancelBooking}
                    disabled={cancelling}
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel registration'}
                  </Button>
                </div>
              </div>
            ) : user ? (
              <>
                {bookingError && (
                  <div className="mt-4 rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">
                    {bookingError}
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-4">
                  <Button variant="primary" onClick={handleBook} disabled={isBooking}>
                    {isBooking ? 'Booking...' : 'Book this event'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-stone-500">
                  Sign in or create an account to book.
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link to="/login" state={{ from: `/listings/${type}/${id}` }}>
                    <Button variant="primary">Log in to book</Button>
                  </Link>
                  <Link to="/register" state={{ from: `/listings/${type}/${id}` }}>
                    <Button variant="outline">Create account</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
