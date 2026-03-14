/**
 * Scheduling Intelligence API Client
 * Pre-aggregated availability data for calendar views
 */

import apiClient from './client';
import { isDemoToken } from '@/mocks/users';
import { getMockSchedulingIntelligence } from '@/mocks/scheduling-intelligence';

function isDemoMode() {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;
  return isDemoToken(token);
}

/**
 * Get scheduling intelligence for a month
 * @param {Object} params - { month, year, communityId?, venueId?, facilitatorId?, hostId? }
 * @returns {Promise<Object>} Per-date intelligence data
 */
export async function getSchedulingIntelligence(params) {
  if (isDemoMode()) {
    return Promise.resolve(getMockSchedulingIntelligence(params));
  }
  const response = await apiClient.get('/api/scheduling/intelligence', { params });
  return response.data;
}
