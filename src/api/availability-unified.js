/**
 * Unified Availability Engine API Client
 * Single API for USER and VENUE availability
 */

import apiClient from './client';
import { isDemoToken } from '@/mocks/users';
import {
  getMockAvailabilityProfile,
  createMockAvailabilityProfile,
  getMockAvailabilitySlots,
  createMockAvailabilitySlot,
  deleteMockAvailabilitySlot,
  getMockAvailabilityOverrides,
  createMockAvailabilityOverride,
  deleteMockAvailabilityOverride,
  getMockCommunityHeatmap,
  getMockVenueAvailability,
  checkMockVenueAvailability,
  getMockVenueAvailabilitySlots,
  getMockVenueAvailabilityByWindow,
  getMockUserAvailability,
  checkMockUserAvailability,
  getMockUserAvailabilitySlots,
  getMockUserAvailabilityByWindow,
  checkMockEventAvailability,
  getMockEventAvailabilitySlots,
} from '@/mocks/availability-unified';

function isDemoMode() {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;
  return isDemoToken(token);
}

// ============================================================================
// PROFILE
// ============================================================================

/**
 * Get availability profile
 * @param {string} ownerType - 'USER' or 'VENUE'
 * @param {string} ownerId - User ID or Venue ID
 * @returns {Promise<{profile, slots, overrides}>}
 */
export async function getAvailabilityProfile(ownerType, ownerId) {
  if (isDemoMode()) {
    let profile = getMockAvailabilityProfile(ownerType, ownerId);
    if (!profile) {
      profile = createMockAvailabilityProfile(ownerType, ownerId);
    }
    const slots = getMockAvailabilitySlots(profile.id);
    const overrides = getMockAvailabilityOverrides(profile.id);
    return Promise.resolve({ profile, slots, overrides });
  }
  const response = await apiClient.get('/api/availability/profile', {
    params: { ownerType, ownerId },
  });
  return response.data;
}

/**
 * Create or update availability profile
 * @param {Object} data - { ownerType, ownerId, timezone? }
 * @returns {Promise<{profile}>}
 */
export async function createAvailabilityProfile(data) {
  if (isDemoMode()) {
    const profile = createMockAvailabilityProfile(data.ownerType, data.ownerId, data.timezone);
    return Promise.resolve({ profile });
  }
  const response = await apiClient.post('/api/availability/profile', data);
  return response.data;
}

// ============================================================================
// SLOTS
// ============================================================================

/**
 * Create availability slot
 * @param {Object} data - { ownerType, ownerId, date?, dayOfWeek?, period, startTime, endTime, status? }
 * @returns {Promise<{slot}>}
 */
export async function createAvailabilitySlot(data) {
  if (isDemoMode()) {
    // Get or create profile
    let profile = getMockAvailabilityProfile(data.ownerType, data.ownerId);
    if (!profile) {
      profile = createMockAvailabilityProfile(data.ownerType, data.ownerId);
    }
    const slot = createMockAvailabilitySlot({
      profileId: profile.id,
      date: data.date || null,
      dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : null,
      period: data.period,
      startTime: data.startTime,
      endTime: data.endTime,
      status: data.status || 'AVAILABLE',
    });
    return Promise.resolve({ slot });
  }
  const response = await apiClient.post('/api/availability/slot', data);
  return response.data;
}

/**
 * Delete availability slot
 * @param {string} slotId
 * @returns {Promise<void>}
 */
export async function deleteAvailabilitySlot(slotId) {
  if (isDemoMode()) {
    deleteMockAvailabilitySlot(slotId);
    return Promise.resolve();
  }
  await apiClient.delete(`/api/availability/slot/${slotId}`);
}

// ============================================================================
// OVERRIDES
// ============================================================================

/**
 * Create availability override
 * @param {Object} data - { ownerType, ownerId, date, startTime, endTime, status, notes? }
 * @returns {Promise<{override}>}
 */
export async function createAvailabilityOverride(data) {
  if (isDemoMode()) {
    // Get or create profile
    let profile = getMockAvailabilityProfile(data.ownerType, data.ownerId);
    if (!profile) {
      profile = createMockAvailabilityProfile(data.ownerType, data.ownerId);
    }
    const override = createMockAvailabilityOverride({
      profileId: profile.id,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      status: data.status,
      notes: data.notes || null,
    });
    return Promise.resolve({ override });
  }
  const response = await apiClient.post('/api/availability/override', data);
  return response.data;
}

/**
 * Delete availability override
 * @param {string} overrideId
 * @returns {Promise<void>}
 */
export async function deleteAvailabilityOverride(overrideId) {
  if (isDemoMode()) {
    deleteMockAvailabilityOverride(overrideId);
    return Promise.resolve();
  }
  await apiClient.delete(`/api/availability/override/${overrideId}`);
}

// ============================================================================
// VENUE AVAILABILITY
// ============================================================================

/**
 * Get venue availability with conflicts
 * @param {string} venueId
 * @param {Object} options - { date?, startTime?, endTime? }
 * @returns {Promise<{profile, slots, overrides, conflicts, available}>}
 */
export async function getVenueAvailability(venueId, options = {}) {
  if (isDemoMode()) {
    return Promise.resolve(getMockVenueAvailability(venueId));
  }
  const response = await apiClient.get(`/api/availability/venues/${venueId}/availability`, { params: options });
  return response.data;
}

/**
 * Check if venue is available for specific time
 * @param {string} venueId
 * @param {Object} data - { date, startTime, endTime }
 * @returns {Promise<{available, conflicts, matchingSlots}>}
 */
export async function checkVenueAvailability(venueId, data) {
  if (isDemoMode()) {
    return Promise.resolve(checkMockVenueAvailability(venueId, data.date, data.startTime, data.endTime));
  }
  const response = await apiClient.post(`/api/availability/venues/${venueId}/check-availability`, data);
  return response.data;
}

/**
 * Get bookable time slots for a venue on a date (Calendly-style).
 * Use for "pick a time" UIs: returns discrete slots (e.g. 9:00, 9:30, 10:00).
 * @param {string} venueId
 * @param {string} date - YYYY-MM-DD
 * @param {Object} options - { durationMinutes?: number, incrementMinutes?: number, minNoticeMinutes?: number }
 * @returns {Promise<{ slots: Array<{ startTime: string, endTime: string }> }>}
 */
export async function getVenueAvailabilitySlots(venueId, date, options = {}) {
  if (isDemoMode()) {
    return Promise.resolve(getMockVenueAvailabilitySlots(venueId, date, options));
  }
  const response = await apiClient.get(`/api/availability/venues/${venueId}/slots`, {
    params: { date, ...options },
  });
  return response.data;
}

/**
 * Get dates in a range when venue is available for a given time window.
 * @param {string} venueId
 * @param {string} dateFrom - YYYY-MM-DD
 * @param {string} dateTo - YYYY-MM-DD
 * @param {string} startTime - HH:MM or HH:MM:SS
 * @param {string} endTime - HH:MM or HH:MM:SS
 * @returns {Promise<{ dates: string[] }>}
 */
export async function getVenueAvailabilityByWindow(venueId, dateFrom, dateTo, startTime, endTime) {
  if (isDemoMode()) {
    return Promise.resolve(getMockVenueAvailabilityByWindow(venueId, dateFrom, dateTo, startTime, endTime));
  }
  const response = await apiClient.get(`/api/availability/venues/${venueId}/availability-by-window`, {
    params: { dateFrom, dateTo, startTime, endTime },
  });
  return response.data;
}

// ============================================================================
// USER AVAILABILITY
// ============================================================================

/**
 * Get user (host/facilitator) availability: profile, slots, overrides.
 * @param {string} userId
 * @returns {Promise<{profile, slots, overrides, conflicts?, available}>}
 */
export async function getUserAvailability(userId) {
  if (isDemoMode()) {
    return Promise.resolve(getMockUserAvailability(userId));
  }
  const response = await apiClient.get(`/api/availability/users/${userId}/availability`);
  return response.data;
}

/**
 * Check if user is available for a specific time window.
 * @param {string} userId
 * @param {Object} data - { date, startTime, endTime }
 * @returns {Promise<{available, conflicts?, matchingSlots?}>}
 */
export async function checkUserAvailability(userId, data) {
  if (isDemoMode()) {
    return Promise.resolve(checkMockUserAvailability(userId, data.date, data.startTime, data.endTime));
  }
  const response = await apiClient.post(`/api/availability/users/${userId}/check-availability`, data);
  return response.data;
}

/**
 * Get bookable time slots for a user on a date.
 * @param {string} userId
 * @param {string} date - YYYY-MM-DD
 * @param {Object} options - { durationMinutes?, incrementMinutes?, minNoticeMinutes? }
 * @returns {Promise<{ slots: Array<{ startTime, endTime }> }>}
 */
export async function getUserAvailabilitySlots(userId, date, options = {}) {
  if (isDemoMode()) {
    return Promise.resolve(getMockUserAvailabilitySlots(userId, date, options));
  }
  const response = await apiClient.get(`/api/availability/users/${userId}/slots`, {
    params: { date, ...options },
  });
  return response.data;
}

/**
 * Get dates in a range when user is available for a given time window.
 * @param {string} userId
 * @param {string} dateFrom - YYYY-MM-DD
 * @param {string} dateTo - YYYY-MM-DD
 * @param {string} startTime - HH:MM or HH:MM:SS
 * @param {string} endTime - HH:MM or HH:MM:SS
 * @returns {Promise<{ dates: string[] }>}
 */
export async function getUserAvailabilityByWindow(userId, dateFrom, dateTo, startTime, endTime) {
  if (isDemoMode()) {
    return Promise.resolve(getMockUserAvailabilityByWindow(userId, dateFrom, dateTo, startTime, endTime));
  }
  const response = await apiClient.get(`/api/availability/users/${userId}/availability-by-window`, {
    params: { dateFrom, dateTo, startTime, endTime },
  });
  return response.data;
}

// ============================================================================
// EVENT COMBINED (venue + host + facilitators)
// ============================================================================

/**
 * Check if all given resources are available for a time window.
 * @param {Object} params - { venueId?, hostId?, facilitatorIds?, date, startTime, endTime }
 * @returns {Promise<{ venueAvailable?, hostAvailable?, facilitatorsAvailable?: Record<string,boolean>, available: boolean }>}
 */
export async function checkEventAvailability(params) {
  if (isDemoMode()) {
    return Promise.resolve(checkMockEventAvailability(params));
  }
  const response = await apiClient.post('/api/availability/check-event', params);
  return response.data;
}

/**
 * Get bookable time slots when all given resources (venue, host, facilitators) are free.
 * @param {Object} params - { venueId?, hostId?, facilitatorIds?, date, durationMinutes?, incrementMinutes?, minNoticeMinutes?, minFacilitators? }
 * @returns {Promise<{ slots: Array<{ startTime, endTime }> }>}
 */
export async function getEventAvailabilitySlots(params) {
  if (isDemoMode()) {
    return Promise.resolve(getMockEventAvailabilitySlots(params));
  }
  const response = await apiClient.get('/api/availability/event-slots', { params: params });
  return response.data;
}

// ============================================================================
// COMMUNITY HEATMAP
// ============================================================================

/**
 * Get community availability heatmap
 * @param {string} communityId
 * @param {Object} options - { includeVenues?: boolean }
 * @returns {Promise<{heatmap, totalMembers, venues?}>}
 */
export async function getCommunityAvailabilityHeatmap(communityId, options = {}) {
  if (isDemoMode()) {
    // Use mock heatmap data
    const { heatmap, totalMembers } = getMockCommunityHeatmap(communityId);
    // Include availableUsers if requested
    if (options.includeVenues === 'true' || options.includeVenues === true) {
      return Promise.resolve({
        heatmap: heatmap.map((h) => ({ ...h, availableUsers: h.availableUsers })),
        totalMembers,
        venues: [
          { id: 'space-demo-1', title: 'Demo Host Studio', hasAvailability: true },
          { id: 'space-demo-2', title: 'Demo Community Hall', hasAvailability: true },
        ],
      });
    }
    return Promise.resolve({ heatmap, totalMembers });
  }
  const response = await apiClient.get(`/api/availability/communities/${communityId}/availability-heatmap`, {
    params: options,
  });
  return response.data;
}
