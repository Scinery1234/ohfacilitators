import apiClient from './client';
import { isDemoToken, getDemoUserFromToken } from '@/mocks/users';
import { mockEvents } from '@/mocks/events';
import { getMockEventDetail } from '@/mocks/events';
import { mockCommunities, getMockCommunity } from '@/mocks/communities';

function isDemoMode() {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;
  return isDemoToken(token);
}

/** Get community IDs the current demo user belongs to (host, facilitator, or member) */
function getDemoUserCommunityIds(userId) {
  if (!userId) return [];
  const ids = new Set();
  mockCommunities.forEach((c) => {
    if (c.hostIds?.includes(userId) || c.facilitatorIds?.includes(userId)) ids.add(c.id);
    // Members: mock doesn't always list memberIds; eventIds in community can still show "community events"
  });
  return [...ids];
}

function parseMockTime(t) {
  if (!t) return '12:00:00';
  const am = /^(\d{1,2}):(\d{2})\s*AM$/i.exec(t);
  if (am) {
    const h = Number(am[1]) === 12 ? 0 : Number(am[1]);
    return `${String(h).padStart(2, '0')}:${am[2]}:00`;
  }
  const pm = /^(\d{1,2}):(\d{2})\s*PM$/i.exec(t);
  if (pm) {
    const h = Number(pm[1]) === 12 ? 12 : Number(pm[1]) + 12;
    return `${String(h).padStart(2, '0')}:${pm[2]}:00`;
  }
  return '12:00:00';
}

/** Map mock event to API event shape for "my events" */
function mockEventToApi(e, opts = {}) {
  const timeStr = e.date ? `${e.date}T${parseMockTime(e.time)}` : null;
  const d = timeStr ? new Date(timeStr) : new Date();
  const startAt = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startAt,
    placeTitle: e.location ?? null,
    creatorName: e.host?.name ?? null,
    createdBy: e.host?.id,
    communityId: e.communityIds?.[0] ?? null,
    capacity: e.capacity,
    visibility: 'public',
    role: opts.role ?? null,
  };
}

/** Check if user is facilitator in any community that has this event */
function isFacilitatorForEvent(mockEvent, userId) {
  const eventCommIds = mockEvent.communityIds || [];
  return mockCommunities.some(
    (c) => eventCommIds.includes(c.id) && (c.facilitatorIds || []).includes(userId)
  );
}

export async function getMyEvents(params = {}) {
  if (isDemoMode()) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const currentUser = token ? getDemoUserFromToken(token) : null;
    const userId = currentUser?.id ?? null;
    const userCommunityIds = getDemoUserCommunityIds(userId);

    let list = mockEvents.filter((e) => {
      const isHost = e.host?.id === userId;
      const eventInMyCommunity = (e.communityIds || []).some((cid) => userCommunityIds.includes(cid));
      if (!isHost && !eventInMyCommunity) return false;
      if (params.communityId) return (e.communityIds || []).includes(params.communityId) && (isHost || eventInMyCommunity);
      return true;
    });

    const events = list.map((e) => {
      const isHost = e.host?.id === userId;
      const role = isHost ? 'owner' : isFacilitatorForEvent(e, userId) ? 'collaborator' : 'member';
      return mockEventToApi(e, { role });
    });
    return Promise.resolve({ events });
  }
  const apiParams = { mine: true };
  if (params.communityId) apiParams.communityId = params.communityId;
  return apiClient.get('/events', { params: apiParams });
}

export async function getEvent(id) {
  if (isDemoMode()) {
    const mock = getMockEventDetail(id);
    if (mock?.event) {
      const communityId = mock.event.communityId;
      if (communityId) {
        const comm = getMockCommunity(communityId);
        if (comm) {
          mock.event.communityName = comm.name;
          mock.event.communitySlug = comm.slug;
        }
      }
      return Promise.resolve(mock);
    }
  }
  return apiClient.get('/events', { params: { id } });
}

export async function getPublicEvents(params = {}) {
  return apiClient.get('/events', { params });
}

export async function createEvent(eventData) {
  return apiClient.post('/events', eventData);
}

export async function updateEvent(id, data) {
  return apiClient.patch('/events', data, { params: { id } });
}

export async function deleteEvent(id) {
  return apiClient.delete('/events', { params: { id } });
}
