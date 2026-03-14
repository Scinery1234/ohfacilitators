import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMyPlaces } from '@/api/places';
import { getMyEvents } from '@/api/events';
import { getMyBooking } from '@/api/bookings';
import { getHostBookings } from '@/mocks/bookings';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { mockEvents } from '@/mocks/events';
import { mockSpaces } from '@/mocks/spaces';

function titleFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null;
  const prefix = 'Booking for ';
  if (notes.startsWith(prefix)) return notes.slice(prefix.length).trim();
  return null;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusBadge(status) {
  const badges = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    waitlist: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-stone-100 text-stone-700',
  };
  return badges[status] || badges.pending;
}

export default function HostDashboard() {
  const { user } = useAuth();
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlaces: 0,
    totalEvents: 0,
    totalBookings: 0,
    upcomingBookings: 0,
    pendingBookings: 0,
  });

  useEffect(() => {
    if (user) {
      Promise.all([
        getMyPlaces()
          .then((d) => d.places || [])
          .catch(() => {
            // Fallback to mock data for demo
            return mockSpaces.filter((s) => s.host?.id === user.id || user.id?.startsWith('demo-')).map((s) => ({
              id: s.id,
              title: s.title,
              address: s.address || s.locationArea,
              visibility: 'public',
            }));
          }),
        getMyEvents()
          .then((d) => d.events || [])
          .catch(() => {
            // Fallback to mock data for demo
            return mockEvents.filter((e) => e.host?.id === user.id || user.id?.startsWith('demo-')).map((e) => ({
              id: e.id,
              title: e.title,
              startAt: e.date ? `${e.date}T${e.time || '12:00:00'}` : null,
              capacity: e.capacity,
              attendees: e.attendees || 0,
            }));
          }),
        getMyBooking('host')
          .then((d) => {
            const bookingsList = d?.bookings || d || [];
            // Transform mock booking format to match API format
            return Array.isArray(bookingsList)
              ? bookingsList.map((b) => ({
                  ...b,
                  listingTitle: b.title || b.listingTitle || titleFromNotes(b.notes),
                  listingType: b.type || b.listingType,
                  listingId: b.spaceId || b.eventId || b.listingId,
                  userName: b.guestName || b.userName,
                  startAt: b.date
                    ? `${b.date}T${(b.startTime || b.time || '12:00:00').replace(/[AP]M/i, '').trim()}`
                    : b.startAt,
                }))
              : [];
          })
          .catch(() => {
            // Fallback to mock data for demo
            if (user.id?.startsWith('demo-') || user.role === 'host') {
              const mockBookings = getHostBookings(user.id) || [];
              return mockBookings.map((b) => ({
                ...b,
                listingTitle: b.title,
                listingType: b.type,
                listingId: b.spaceId || b.eventId,
                userName: b.guestName,
                startAt: b.date
                  ? `${b.date}T${(b.startTime || b.time || '12:00:00').replace(/[AP]M/i, '').trim()}`
                  : null,
              }));
            }
            return [];
          }),
      ]).then(([p, e, b]) => {
        setPlaces(p);
        setEvents(e);
        setBookings(Array.isArray(b) ? b : []);

        // Calculate stats
        const upcomingBookings = b.filter((booking) => {
          if (!booking.startAt) return false;
          return new Date(booking.startAt) > new Date();
        }).length;

        const pendingBookings = b.filter((booking) => booking.status === 'pending').length;

        setStats({
          totalPlaces: p.length,
          totalEvents: e.length,
          totalBookings: b.length,
          upcomingBookings,
          pendingBookings,
        });

        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
          Host Dashboard
        </h1>
        <p className="mt-2 text-stone-600">Manage your listings, events, and bookings.</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-stone-900">{stats.totalPlaces}</div>
            <div className="text-sm text-stone-600 mt-1">Places</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-stone-900">{stats.totalEvents}</div>
            <div className="text-sm text-stone-600 mt-1">Events</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-stone-900">{stats.totalBookings}</div>
            <div className="text-sm text-stone-600 mt-1">Total Bookings</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-200">{stats.upcomingBookings}</div>
            <div className="text-sm text-stone-600 mt-1">Upcoming</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">{stats.pendingBookings}</div>
            <div className="text-sm text-stone-600 mt-1">Pending</div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <Link to="/list-place">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-200/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">List a Place</h3>
            </div>
            <p className="text-stone-600 text-sm">Create a new place listing</p>
          </Card>
        </Link>

        <Link to="/host-event">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-200/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">Host an Event</h3>
            </div>
            <p className="text-stone-600 text-sm">Create a new event</p>
          </Card>
        </Link>

        <Link to="/my-places">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-200/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">Manage Places</h3>
            </div>
            <p className="text-stone-600 text-sm">View and edit your places</p>
          </Card>
        </Link>
      </div>

      {/* Recent Bookings */}
      <Card className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Recent Bookings</h2>
          <Link to="/bookings" className="text-sm text-primary-200 hover:text-primary-300">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="text-stone-500 text-sm py-8 text-center">Loading bookings...</div>
        ) : bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-stone-900">
                      {booking.listingTitle || booking.notes || 'Booking'}
                    </h3>
                    {booking.startAt && (
                      <p className="text-sm text-stone-500 mt-1">{formatDate(booking.startAt)}</p>
                    )}
                    {booking.userName && (
                      <p className="text-sm text-stone-600 mt-1">Guest: {booking.userName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {booking.status && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(booking.status)}`}>
                        {booking.status}
                      </span>
                    )}
                    {booking.listingType === 'event' && booking.listingId && (
                      <Link
                        to={`/listings/event/${booking.listingId}`}
                        className="text-sm text-primary-200 hover:text-primary-300 font-medium"
                      >
                        View event →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No bookings yet"
            message="Bookings for your events and places will appear here."
            className="py-8"
          />
        )}
      </Card>

      {/* My Events */}
      <Card className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">My Events</h2>
          <Link to="/my-events" className="text-sm text-primary-200 hover:text-primary-300">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="text-stone-500 text-sm py-8 text-center">Loading events...</div>
        ) : events.length > 0 ? (
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <Link
                key={event.id}
                to={`/listings/event/${event.id}`}
                className="block p-4 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-stone-900">{event.title}</h3>
                    {event.startAt && (
                      <p className="text-sm text-stone-500 mt-1">{formatDate(event.startAt)}</p>
                    )}
                    {event.capacity && (
                      <p className="text-sm text-stone-600 mt-1">
                        {event.attendees || 0} / {event.capacity} attendees
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-primary-200 font-medium">View →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No events yet"
            message="Create your first event to start hosting."
            className="py-8"
          >
            <Link to="/host-event">
              <Button variant="primary" className="mt-4">Create Event</Button>
            </Link>
          </EmptyState>
        )}
      </Card>

      {/* My Places */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">My Places</h2>
          <Link to="/my-places" className="text-sm text-primary-200 hover:text-primary-300">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="text-stone-500 text-sm py-8 text-center">Loading places...</div>
        ) : places.length > 0 ? (
          <div className="space-y-3">
            {places.slice(0, 5).map((place) => (
              <Link
                key={place.id}
                to={`/places/${place.id}`}
                className="block p-4 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-stone-900">{place.title}</h3>
                    {place.address && (
                      <p className="text-sm text-stone-500 mt-1">{place.address}</p>
                    )}
                    {place.visibility && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 capitalize">
                        {place.visibility}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-primary-200 font-medium">View →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No places yet"
            message="List your first place to start hosting events."
            className="py-8"
          >
            <Link to="/list-place">
              <Button variant="primary" className="mt-4">List a Place</Button>
            </Link>
          </EmptyState>
        )}
      </Card>
    </div>
  );
}
