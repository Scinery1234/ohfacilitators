import apiClient from './client';
import { isDemoToken } from '@/mocks/users';
import { getUserBookings, getHostBookings, addDemoBooking } from '@/mocks/bookings';

function isDemoMode() {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;
  return isDemoToken(token);
}

function getDemoUserId() {
  try {
    const stored = localStorage.getItem('demoUser');
    const u = stored ? JSON.parse(stored) : null;
    return u?.id || 'demo-user-1';
  } catch {
    return 'demo-user-1';
  }
}

/** Normalize mock booking for list/detail: ensure listingType, listingId, createdAt */
function normalizeMockBookings(list) {
  return (list || []).map((b) => ({
    ...b,
    listingType: b.listingType || (b.type === 'event' ? 'event' : 'space'),
    listingId: b.listingId || b.eventId || b.spaceId,
    createdAt: b.createdAt || new Date().toISOString(),
  }));
}

export const createBooking = (bookingData) => {
  if (isDemoMode()) {
    const userId = getDemoUserId();
    const booking = {
      id: `booking-demo-${Date.now()}`,
      listingType: bookingData.listingType || 'event',
      listingId: bookingData.listingId,
      hostId: bookingData.hostId ?? null,
      userId,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      ...bookingData,
    };
    addDemoBooking(booking);
    return Promise.resolve({ booking });
  }
  return apiClient.post('/bookings', bookingData);
};

export const getMyBooking = (scope = 'mine') => {
  if (isDemoMode()) {
    const userId = getDemoUserId();
    const list = scope === 'host' ? getHostBookings(userId) : getUserBookings(userId);
    return Promise.resolve({ bookings: normalizeMockBookings(list) });
  }
  return apiClient.get('/bookings', { params: { scope } });
};

export const getBookingById = (id) => {
  return apiClient.get('/bookings', { params: { id } });
};

export const updateBooking = (id, bookingData) => {
  return apiClient.patch('/bookings', bookingData, { params: { id } });
};
export const deleteBooking = (id) => {
  return apiClient.delete('/bookings', { params: { id } });
};

/** Manual add attendee (event owner/collaborator only) */
export const addEventAttendee = (eventId, userId) => {
  return apiClient.post('/bookings', { action: 'add-attendee', eventId, userId });
};
