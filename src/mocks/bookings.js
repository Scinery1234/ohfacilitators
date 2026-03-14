// In-memory demo bookings (added when user books in demo mode)
let demoBookings = [];
// Extra attendee count per event (incremented when a demo booking is added for that event)
const eventAttendeeIncrements = {};

/**
 * Add a booking in demo mode (called from api/bookings createBooking).
 * Stores the booking so getUserBookings/getHostBookings return it and increments event attendee count.
 */
export function addDemoBooking(booking) {
  demoBookings.push(booking);
  if (booking.listingType === 'event' && booking.listingId) {
    eventAttendeeIncrements[booking.listingId] = (eventAttendeeIncrements[booking.listingId] || 0) + 1;
  }
}

/**
 * Return the extra attendee count for an event (from demo bookings only).
 * Used by getMockEventDetail to show updated count.
 */
export function getEventAttendeeIncrement(eventId) {
  return eventAttendeeIncrements[eventId] || 0;
}

// Mock bookings data for demo mode
export const mockUserBookings = [
  {
    id: 'booking-1',
    type: 'space',
    spaceId: 'space-1',
    title: 'Cozy Art Studio',
    date: '2024-02-12',
    startTime: '10:00 AM',
    endTime: '2:00 PM',
    price: 100,
    status: 'confirmed',
    host: {
      name: 'Sam Chen',
    },
  },
  {
    id: 'booking-2',
    type: 'event',
    eventId: 'event-2',
    title: 'Morning Yoga Flow',
    date: '2024-02-10',
    time: '7:00 AM',
    price: 18,
    status: 'confirmed',
    host: {
      name: 'Marcus Rodriguez',
    },
  },
  {
    id: 'booking-3',
    type: 'space',
    spaceId: 'space-6',
    title: 'Quiet Study Library',
    date: '2024-02-08',
    startTime: '9:00 AM',
    endTime: '5:00 PM',
    price: 120,
    status: 'pending',
    host: {
      name: 'Maya Patel',
    },
  },
];

export const mockHostBookings = [
  {
    id: 'host-booking-1',
    type: 'space',
    spaceId: 'space-1',
    title: 'Cozy Art Studio',
    guestName: 'Elena Rossi',
    date: '2024-02-12',
    startTime: '10:00 AM',
    endTime: '2:00 PM',
    price: 100,
    status: 'confirmed',
  },
  {
    id: 'host-booking-2',
    type: 'space',
    spaceId: 'space-1',
    title: 'Cozy Art Studio',
    guestName: 'David Kim',
    date: '2024-02-14',
    startTime: '3:00 PM',
    endTime: '6:00 PM',
    price: 75,
    status: 'pending',
  },
];

export const getUserBookings = (userId) => {
  const base = (userId === 'demo-user-1' || userId?.startsWith('demo-')) ? mockUserBookings : [];
  const fromDemo = demoBookings.filter((b) => b.userId === userId);
  return [...base, ...fromDemo];
};

export const getHostBookings = (hostId) => {
  const base = (hostId === 'demo-host-1' || hostId?.startsWith('demo-')) ? mockHostBookings : [];
  const fromDemo = demoBookings.filter((b) => b.hostId === hostId);
  return [...base, ...fromDemo];
};
