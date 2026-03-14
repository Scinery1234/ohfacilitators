import apiClient from './client';
import { isDemoToken } from '@/mocks/users';
import {
  getDemoPlaceAvailability,
  getDemoFacilitatorAvailability,
  getDemoMemberAvailability,
  getDemoMemberAvailabilityCount,
  addDemoPlaceAvailability,
  removeDemoPlaceAvailability,
  addDemoFacilitatorAvailability,
  removeDemoFacilitatorAvailability,
  addDemoMemberAvailability,
  removeDemoMemberAvailability,
} from '@/mocks/availability';

function isDemoMode() {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;
  return isDemoToken(token);
}

function getDemoUserId() {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('demoUser') : null;
    if (stored) {
      const u = JSON.parse(stored);
      return u?.id || 'demo-user-1';
    }
  } catch {
    // ignore parse/localStorage errors
  }
  return 'demo-user-1';
}

/**
 * Place Availability API
 * For venue hosts to manage when their place is available
 */

/**
 * Get place availability
 * @param {string} placeId - Optional: filter by place ID
 * @param {string} date - Optional: filter by date (YYYY-MM-DD)
 * @returns {Promise<{availability: Array}>}
 */
export async function getPlaceAvailability(placeId = null, date = null) {
  if (isDemoMode()) {
    const availability = getDemoPlaceAvailability(placeId, date);
    return Promise.resolve({ availability });
  }
  const params = {};
  if (placeId) params.placeId = placeId;
  if (date) params.date = date;
  const response = await apiClient.get('/availability/places', { params });
  return { availability: response?.availability ?? [] };
}

/**
 * Create place availability
 * @param {Object} data - { placeId, date, startTime, endTime }
 * @returns {Promise<{availability: Object}>}
 */
export async function createPlaceAvailability(data) {
  if (isDemoMode()) {
    const availability = addDemoPlaceAvailability(data);
    return Promise.resolve({ availability });
  }
  const response = await apiClient.post('/availability/places', data);
  return { availability: response?.availability };
}

/**
 * Delete place availability
 * @param {string} id - Availability record ID
 * @returns {Promise<void>}
 */
export async function deletePlaceAvailability(id) {
  if (isDemoMode()) {
    removeDemoPlaceAvailability(id);
    return Promise.resolve();
  }
  await apiClient.delete(`/availability/places/${id}`);
}

/**
 * Facilitator Availability API
 * For facilitators to mark when they're available
 */

/**
 * Get facilitator availability
 * @param {string} userId - Optional: filter by user ID
 * @param {string} date - Optional: filter by date (YYYY-MM-DD)
 * @returns {Promise<{availability: Array}>}
 */
export async function getFacilitatorAvailability(userId = null, date = null) {
  if (isDemoMode()) {
    const availability = getDemoFacilitatorAvailability(userId, date);
    return Promise.resolve({ availability });
  }
  const params = {};
  if (userId) params.userId = userId;
  if (date) params.date = date;
  const response = await apiClient.get('/availability/facilitators', { params });
  return { availability: response?.availability ?? [] };
}

/**
 * Create facilitator availability
 * @param {Object} data - { date, startTime, endTime }
 * @returns {Promise<{availability: Object}>}
 */
export async function createFacilitatorAvailability(data) {
  if (isDemoMode()) {
    const availability = addDemoFacilitatorAvailability({ ...data, userId: getDemoUserId() });
    return Promise.resolve({ availability });
  }
  const response = await apiClient.post('/availability/facilitators', data);
  return { availability: response?.availability };
}

/**
 * Delete facilitator availability
 * @param {string} id - Availability record ID
 * @returns {Promise<void>}
 */
export async function deleteFacilitatorAvailability(id) {
  if (isDemoMode()) {
    removeDemoFacilitatorAvailability(id);
    return Promise.resolve();
  }
  await apiClient.delete(`/availability/facilitators/${id}`);
}

/**
 * Member Availability API
 * For community members to mark when they're available
 */

/**
 * Get member availability
 * @param {string} userId - Optional: filter by user ID
 * @param {string} communityId - Optional: filter by community ID
 * @param {string} date - Optional: filter by date (YYYY-MM-DD)
 * @returns {Promise<{availability: Array}>}
 */
export async function getMemberAvailability(userId = null, communityId = null, date = null) {
  if (isDemoMode()) {
    const availability = getDemoMemberAvailability(userId, communityId, date);
    return Promise.resolve({ availability });
  }
  const params = {};
  if (userId) params.userId = userId;
  if (communityId) params.communityId = communityId;
  if (date) params.date = date;
  const response = await apiClient.get('/availability/members', { params });
  return { availability: response?.availability ?? [] };
}

/**
 * Get member availability count for a date
 * @param {string} communityId - Community ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<number>}
 */
export async function getMemberAvailabilityCount(communityId, date) {
  if (isDemoMode()) {
    return Promise.resolve(getDemoMemberAvailabilityCount(communityId, date));
  }
  const response = await apiClient.get('/availability/members', {
    params: { communityId, date },
  });
  const list = response?.availability;
  return Array.isArray(list) ? list.length : 0;
}

/**
 * Create member availability
 * @param {Object} data - { date, communityId (optional) }
 * @returns {Promise<{availability: Object}>}
 */
export async function createMemberAvailability(data) {
  if (isDemoMode()) {
    const availability = addDemoMemberAvailability({ ...data, userId: getDemoUserId() });
    return Promise.resolve({ availability });
  }
  const response = await apiClient.post('/availability/members', data);
  return { availability: response?.availability };
}

/**
 * Delete member availability
 * @param {string} id - Availability record ID
 * @returns {Promise<void>}
 */
export async function deleteMemberAvailability(id) {
  if (isDemoMode()) {
    removeDemoMemberAvailability(id);
    return Promise.resolve();
  }
  await apiClient.delete(`/availability/members/${id}`);
}

/**
 * Helper: Check if a place is available for a date/time
 * @param {Array} availability - Array of availability records
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM:SS)
 * @param {string} endTime - End time (HH:MM:SS)
 * @returns {boolean}
 */
export function isPlaceAvailable(availability, date, startTime, endTime) {
  if (!availability || availability.length === 0) return false;
  
  return availability.some((avail) => {
    if (avail.date !== date) return false;
    
    // Check time overlap
    const availStart = avail.startTime || '00:00:00';
    const availEnd = avail.endTime || '23:59:59';
    
    // Time ranges overlap if: start < other.end AND end > other.start
    return startTime < availEnd && endTime > availStart;
  });
}

/**
 * Helper: Check if a facilitator is available for a date
 * @param {Array} availability - Array of availability records
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {boolean}
 */
export function isFacilitatorAvailable(availability, date) {
  if (!availability || availability.length === 0) return false;
  return availability.some((avail) => avail.date === date);
}
