import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { mockFacilitators } from '@/mocks/facilitators';
import { mockCommunities } from '@/mocks/communities';
import { getFacilitatorAvatarUrl } from '@/lib/avatars';
import { createBooking } from '@/api/bookings';
import { getUserAvailabilitySlots } from '@/api/availability-unified';
import Button from '@/components/ui/Button';

function getMockFacilitator(id) {
  return mockFacilitators.find((f) => f.id === id) ?? null;
}

function getFacilitatorCommunities(facilitatorId) {
  return mockCommunities.filter((c) => c.facilitatorIds?.includes(facilitatorId));
}

export default function FacilitatorDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [slotsDate, setSlotsDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const facilitator = getMockFacilitator(id);

  useEffect(() => {
    if (!id || !slotsDate) return;
    setSlotsLoading(true);
    getUserAvailabilitySlots(id, slotsDate, { durationMinutes: 60 })
      .then((data) => setSlots(data?.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [id, slotsDate]);

  const handleBook = async () => {
    if (!user) return;

    setIsBooking(true);
    setBookingError('');

    try {
      const result = await createBooking({
        listingType: 'facilitator',
        listingId: id,
        notes: `Booking session with ${facilitator.name}`,
      });
      setBooking(result.booking);
    } catch (err) {
      setBookingError(err?.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (!facilitator) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-display font-semibold text-stone-900">Facilitator not found</h1>
        <p className="mt-2 text-stone-600">This facilitator may no longer be available.</p>
        <Link to="/explore" className="mt-6 inline-block">
          <Button variant="primary">Browse facilitators</Button>
        </Link>
      </div>
    );
  }

  const communities = getFacilitatorCommunities(id);
  const avatarUrl = getFacilitatorAvatarUrl(id, 300);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <Link
        to="/explore"
        className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors mb-8"
      >
        ← Back to Discover
      </Link>

      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6 sm:p-8 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="shrink-0">
            <img
              src={avatarUrl}
              alt=""
              className="h-28 w-28 rounded-full object-cover border-2 border-stone-200"
            />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
              {facilitator.name}
            </h1>
            <p className="mt-1 text-primary-200 font-medium">{facilitator.type}</p>
            <p className="mt-3 text-stone-600">{facilitator.description}</p>
            {communities.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {communities.map((c) => (
                  <Link
                    key={c.id}
                    to={`/communities/${c.slug}`}
                    className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* When I'm available: unified availability engine */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6 sm:p-8 mb-10">
        <h2 className="text-xl font-display font-semibold text-stone-900 mb-2">When I&apos;m available</h2>
        <p className="text-stone-600 text-sm mb-4">Choose a date to see available time slots for sessions.</p>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label htmlFor="fac-slots-date" className="text-sm font-medium text-stone-700">Date</label>
          <input
            id="fac-slots-date"
            type="date"
            value={slotsDate}
            onChange={(e) => setSlotsDate(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </div>
        {slotsLoading ? (
          <p className="text-stone-500 text-sm">Loading slots…</p>
        ) : slots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <span
                key={`${slot.startTime}-${slot.endTime}`}
                className="inline-flex items-center rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-sm text-green-800"
              >
                {slot.startTime} – {slot.endTime}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 text-sm">No available slots on this day.</p>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6">
        {booking ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-green-800 font-medium mb-2">Booking confirmed!</p>
            <p className="text-sm text-green-700 mb-3">Your booking is pending confirmation. Check your bookings page for updates.</p>
            <Link to="/bookings">
              <Button variant="secondary" className="text-sm">View my bookings</Button>
            </Link>
          </div>
        ) : user ? (
          <>
            {bookingError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">
                {bookingError}
              </div>
            )}
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" onClick={handleBook} disabled={isBooking}>
                {isBooking ? 'Booking...' : 'Book a session'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-stone-600 mb-4">Sign in or create an account to book a session.</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/login" state={{ from: `/facilitators/${id}` }}>
                <Button variant="primary">Log in to book</Button>
              </Link>
              <Link to="/register" state={{ from: `/facilitators/${id}` }}>
                <Button variant="outline">Create account</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
