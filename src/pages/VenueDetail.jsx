import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLoaderData } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPlace, deletePlace } from '@/api/places';
import { getMockVenueDetail } from '@/mocks/venues';
import { getSpaceImage } from '@/lib/listingImages';
import { createBooking } from '@/api/bookings';
import Button from '@/components/ui/Button';
import EventsCalendar from '@/components/EventsCalendar';

function formatEventDate(startAt) {
  if (!startAt) return '';
  return new Date(startAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Check if ID looks like a mock ID (e.g., 'space-1') vs UUID
function isMockId(id) {
  return /^(space|event|host|fac|comm)-\d+$/.test(id);
}

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const loaderData = useLoaderData();
  const { user } = useAuth();
  const [place, setPlace] = useState(() => loaderData?.place ?? null);
  const [loading, setLoading] = useState(!loaderData?.place);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    if (loaderData?.place && loaderData.place.id === id) {
      setPlace(loaderData.place);
      setLoading(false);
      return;
    }
  }, [loaderData, id]);

  useEffect(() => {
    if (!id || loaderData?.place) return;
    setLoading(true);
    setError(null);
    if (isMockId(id)) {
      const mock = getMockVenueDetail(id);
      if (mock) {
        setPlace(mock.place);
        setLoading(false);
        return;
      }
    }
    getPlace(id)
      .then((data) => setPlace(data.place ?? data))
      .catch((e) => {
        const mock = getMockVenueDetail(id);
        if (mock) setPlace(mock.place);
        else setError(e?.response?.data?.message || 'Failed to load venue');
      })
      .finally(() => setLoading(false));
  }, [id, loaderData?.place]);

  const handleBook = async () => {
    if (!user || !place) return;

    setIsBooking(true);
    setBookingError('');

    try {
      const result = await createBooking({
        listingType: 'place',
        listingId: id,
        hostId: place.collaborators?.[0]?.userId || place.createdBy || null,
        notes: `Booking for ${place.title}`,
      });
      setBooking(result.booking);
    } catch (err) {
      setBookingError(err?.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-stone-500">Loading…</div>
    );
  }

  if (error || !place) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-display font-semibold text-stone-900">We couldn’t load this venue</h1>
        <p className="mt-2 text-stone-600">{error || 'This venue may no longer be available or the link may be wrong.'}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>Try again</Button>
          <Link to="/explore">
            <Button variant="secondary">Explore venues</Button>
          </Link>
        </div>
      </div>
    );
  }

  const hostName = place.collaborators?.[0]?.fullName || place.host?.name || null;
  const events = place.events || [];
  const eventsWithDate = events.map((e) => {
    const startAt = e.startAt;
    const d = startAt ? new Date(startAt) : null;
    const validD = d && !Number.isNaN(d.getTime()) ? d : null;
    return {
      ...e,
      date: e.date || (validD ? validD.toISOString().slice(0, 10) : ''),
      time: e.time || (validD ? validD.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''),
      location: e.location ?? e.placeTitle ?? '',
      locationArea: e.locationArea ?? '',
      price: e.price ?? 0,
    };
  });
  const image = place.imageUrl || getSpaceImage(place);
  const canEdit = (place.role === 'owner' || place.role === 'collaborator') || user?.isAdmin;
  const isRealPlace = !isMockId(id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full min-w-0">
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          ← Back to Explore
        </Link>
        <span className="text-stone-300">·</span>
        <span className="text-sm text-stone-500">Venue</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 mb-14">
        <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm aspect-[4/3] lg:aspect-auto lg:min-h-[400px]">
          <img src={image} alt="" className="h-full w-full object-cover" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight">
            {place.title}
          </h1>
          {canEdit && isRealPlace && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/places/${id}/edit`}>
                <Button variant="secondary" className="text-sm">Edit venue</Button>
              </Link>
              <Button
                variant="outline"
                className="text-sm text-red-700 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  if (!window.confirm(`Delete "${place.title}"? This cannot be undone.`)) return;
                  try {
                    await deletePlace(id);
                    navigate('/explore');
                  } catch (e) {
                    alert(e?.response?.data?.message || 'Failed to delete');
                  }
                }}
              >
                Delete venue
              </Button>
            </div>
          )}
          {hostName && (
            <p className="mt-2 text-stone-600">
              Listed by <span className="font-medium text-stone-900">{hostName}</span>
            </p>
          )}
          <p className="mt-6 text-stone-700 leading-relaxed">{place.description || 'No description.'}</p>

          {place.address && (
            <div className="mt-6 p-4 rounded-xl border border-stone-200 bg-stone-50/50">
              <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-2">
                <span aria-hidden>📍</span> Location
              </h3>
              <p className="mt-1.5 text-stone-700">{place.address}</p>
            </div>
          )}

          {/* Contact host - for logged-in users (only if not the place owner) */}
          {user && place.createdBy && place.createdBy !== user.id && (
            <div className="mt-6">
              <Link
                to="/messages"
                state={{
                  compose: {
                    type: 'contact',
                    recipientUserId: place.collaborators?.[0]?.userId || place.createdBy,
                    recipientUserName: hostName || 'Venue host',
                    contextType: 'place',
                    contextId: id,
                    contextTitle: place.title,
                    suggestedMessage: `I'm interested in ${place.title} and have a question: `,
                  },
                }}
              >
                <Button variant="outline" className="text-sm">Contact host</Button>
              </Link>
            </div>
          )}

          <div className="mt-10 pt-8 border-t border-stone-200">
            {booking ? (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="text-green-800 font-medium mb-2">Booking confirmed!</p>
                <p className="text-sm text-green-700">Your booking is pending confirmation. Check your bookings page for updates.</p>
                <Link to="/bookings" className="mt-3 inline-block">
                  <Button variant="secondary" className="text-sm">View my bookings</Button>
                </Link>
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
                    {isBooking ? 'Booking...' : 'Book this venue'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-stone-500">Sign in or create an account to book.</p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link to="/login" state={{ from: `/venues/${id}` }}>
                    <Button variant="primary">Log in to book</Button>
                  </Link>
                  <Link to="/register" state={{ from: `/venues/${id}` }}>
                    <Button variant="outline">Create account</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {events.length > 0 && (
        <>
          <section className="py-10 border-t border-stone-200">
            <h2 className="font-display text-2xl font-semibold text-stone-900 tracking-tight mb-2">
              Calendar of events
            </h2>
            <p className="text-stone-600 text-sm mb-6">
              See what&apos;s happening at {place.title}.
            </p>
            <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-10">
              <EventsCalendar events={eventsWithDate} />
            </div>
          </section>

          <section className="py-10 border-t border-stone-200">
            <h2 className="font-display text-2xl font-semibold text-stone-900 tracking-tight mb-6">
              Events at this venue
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/listings/event/${event.id}`}
                  className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-300 transition-all"
                >
                  <div className="p-4">
                    <h3 className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {formatEventDate(event.startAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
