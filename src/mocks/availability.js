/**
 * Mock availability data for demo mode.
 * Used when user is logged in as demo (token starts with "demo:") so availability
 * features work without a backend.
 * When a date is provided, facilitator availability is derived from the unified engine.
 */

import { DEMO_COMMUNITY_ID } from './communities';
import { checkMockUserAvailability } from './availability-unified';

/** Facilitator user IDs used for unified-engine bridge when querying by date */
const FACILITATOR_IDS = ['demo-host-1', 'demo-user-1', 'fac-1', 'fac-2', 'fac-3', 'fac-4'];

// Place availability: demo host's venues (space-demo-1, space-demo-2) available on several dates
const MOCK_PLACE_AVAILABILITY = [
  { id: 'pa-1', placeId: 'space-demo-1', date: '2025-03-15', startTime: '09:00:00', endTime: '18:00:00' },
  { id: 'pa-2', placeId: 'space-demo-1', date: '2025-03-22', startTime: '14:00:00', endTime: '22:00:00' },
  { id: 'pa-3', placeId: 'space-demo-1', date: '2025-03-29', startTime: '10:00:00', endTime: '16:00:00' },
  { id: 'pa-4', placeId: 'space-demo-2', date: '2025-03-15', startTime: '08:00:00', endTime: '20:00:00' },
  { id: 'pa-5', placeId: 'space-demo-2', date: '2025-03-22', startTime: '17:00:00', endTime: '23:00:00' },
  { id: 'pa-6', placeId: 'space-demo-2', date: '2025-03-29', startTime: '09:00:00', endTime: '18:00:00' },
];

// Facilitator availability: demo user and demo host available on some dates
const MOCK_FACILITATOR_AVAILABILITY = [
  { id: 'fa-1', userId: 'demo-host-1', date: '2025-03-15', startTime: '10:00:00', endTime: '17:00:00' },
  { id: 'fa-2', userId: 'demo-host-1', date: '2025-03-22', startTime: '14:00:00', endTime: '21:00:00' },
  { id: 'fa-3', userId: 'demo-user-1', date: '2025-03-15', startTime: null, endTime: null },
  { id: 'fa-4', userId: 'demo-user-1', date: '2025-03-22', startTime: '18:00:00', endTime: '21:00:00' },
];

// Member availability: 5 demo community members with various dates (for member count)
const MOCK_MEMBER_AVAILABILITY = [
  { id: 'ma-1', userId: 'demo-user-1', communityId: DEMO_COMMUNITY_ID, date: '2025-03-15' },
  { id: 'ma-2', userId: 'demo-user-1', communityId: DEMO_COMMUNITY_ID, date: '2025-03-22' },
  { id: 'ma-3', userId: 'demo-user-2', communityId: DEMO_COMMUNITY_ID, date: '2025-03-15' },
  { id: 'ma-4', userId: 'demo-user-2', communityId: DEMO_COMMUNITY_ID, date: '2025-03-29' },
  { id: 'ma-5', userId: 'demo-user-3', communityId: DEMO_COMMUNITY_ID, date: '2025-03-15' },
  { id: 'ma-6', userId: 'demo-user-3', communityId: DEMO_COMMUNITY_ID, date: '2025-03-22' },
  { id: 'ma-7', userId: 'demo-user-4', communityId: DEMO_COMMUNITY_ID, date: '2025-03-22' },
  { id: 'ma-8', userId: 'demo-user-5', communityId: DEMO_COMMUNITY_ID, date: '2025-03-15' },
  { id: 'ma-9', userId: 'demo-user-5', communityId: DEMO_COMMUNITY_ID, date: '2025-03-22' },
];

export function getMockPlaceAvailability(placeId = null, date = null) {
  let list = MOCK_PLACE_AVAILABILITY;
  if (placeId) list = list.filter((a) => a.placeId === placeId);
  if (date) list = list.filter((a) => a.date === date);
  return list;
}

export function getMockFacilitatorAvailability(userId = null, date = null) {
  let list = MOCK_FACILITATOR_AVAILABILITY;
  if (userId) list = list.filter((a) => a.userId === userId);
  if (date) list = list.filter((a) => a.date === date);
  return list;
}

export function getMockMemberAvailability(userId = null, communityId = null, date = null) {
  let list = MOCK_MEMBER_AVAILABILITY;
  if (userId) list = list.filter((a) => a.userId === userId);
  if (communityId) list = list.filter((a) => a.communityId === communityId);
  if (date) list = list.filter((a) => a.date === date);
  return list;
}

export function getMockMemberAvailabilityCount(communityId, date) {
  return MOCK_MEMBER_AVAILABILITY.filter(
    (a) => a.communityId === communityId && a.date === date
  ).length;
}

/** In-memory store for demo user-created availability (create/delete in UI) */
let demoPlaceAvailability = [...MOCK_PLACE_AVAILABILITY];
let demoFacilitatorAvailability = [...MOCK_FACILITATOR_AVAILABILITY];
let demoMemberAvailability = [...MOCK_MEMBER_AVAILABILITY];

export function getDemoPlaceAvailability(placeId = null, date = null) {
  let list = demoPlaceAvailability;
  if (placeId) list = list.filter((a) => a.placeId === placeId);
  if (date) list = list.filter((a) => a.date === date);
  return list;
}

export function getDemoFacilitatorAvailability(userId = null, date = null) {
  // When date is provided, use unified engine so HostEvent/scheduling show consistent data
  if (date) {
    const ids = userId ? [userId] : FACILITATOR_IDS;
    const list = ids
      .filter((id) => checkMockUserAvailability(id, date, '09:00', '17:00')?.available)
      .map((id, i) => ({
        id: `fa-unified-${date}-${i}`,
        userId: id,
        date,
        startTime: '09:00',
        endTime: '17:00',
      }));
    return list;
  }
  let list = demoFacilitatorAvailability;
  if (userId) list = list.filter((a) => a.userId === userId);
  return list;
}

export function getDemoMemberAvailability(userId = null, communityId = null, date = null) {
  let list = demoMemberAvailability;
  if (userId) list = list.filter((a) => a.userId === userId);
  if (communityId) list = list.filter((a) => a.communityId === communityId);
  if (date) list = list.filter((a) => a.date === date);
  return list;
}

export function getDemoMemberAvailabilityCount(communityId, date) {
  return demoMemberAvailability.filter(
    (a) => a.communityId === communityId && a.date === date
  ).length;
}

function nextId(prefix, list) {
  const max = list.reduce((m, a) => {
    const n = parseInt(String(a.id).replace(/\D/g, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `${prefix}-${max + 1}`;
}

export function addDemoPlaceAvailability(data) {
  const rec = {
    id: nextId('pa', demoPlaceAvailability),
    placeId: data.placeId,
    date: data.date,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
  };
  demoPlaceAvailability.push(rec);
  return rec;
}

export function removeDemoPlaceAvailability(id) {
  demoPlaceAvailability = demoPlaceAvailability.filter((a) => a.id !== id);
}

export function addDemoFacilitatorAvailability(data) {
  const rec = {
    id: nextId('fa', demoFacilitatorAvailability),
    userId: data.userId || 'demo-user-1',
    date: data.date,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
  };
  demoFacilitatorAvailability.push(rec);
  return rec;
}

export function removeDemoFacilitatorAvailability(id) {
  demoFacilitatorAvailability = demoFacilitatorAvailability.filter((a) => a.id !== id);
}

export function addDemoMemberAvailability(data) {
  const rec = {
    id: nextId('ma', demoMemberAvailability),
    userId: data.userId || 'demo-user-1',
    communityId: data.communityId || DEMO_COMMUNITY_ID,
    date: data.date,
  };
  demoMemberAvailability.push(rec);
  return rec;
}

export function removeDemoMemberAvailability(id) {
  demoMemberAvailability = demoMemberAvailability.filter((a) => a.id !== id);
}
