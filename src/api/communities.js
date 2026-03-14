import apiClient from './client';
import { isDemoToken } from '@/mocks/users';
import { getMockCommunityDetail, mockCommunities } from '@/mocks/communities';
import { DEMO_COMMUNITY_MEMBERS } from '@/mocks/users';
import { getDemoMemberAvatarUrl } from '@/lib/avatars';
import { mockSpaces } from '@/mocks/spaces';
import { mockEvents } from '@/mocks/events';

function isDemoMode() {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;
  return isDemoToken(token);
}

export async function getExploreData() {
  if (isDemoMode()) {
    return Promise.resolve({
      communities: mockCommunities,
      places: mockSpaces,
      events: mockEvents,
    });
  }
  return apiClient.get('/explore');
}

export async function getMyCommunities() {
  if (isDemoMode()) {
    let demoRole = 'member';
    try {
      const stored = localStorage.getItem('demoUser');
      const u = stored ? JSON.parse(stored) : null;
      demoRole = u?.role === 'host' ? 'owner' : 'collaborator';
    } catch {
      // use default demoRole
    }
    const communities = mockCommunities.slice(0, 3).map((c, i) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      visibility: 'public',
      role: c.id === 'comm-demo' ? demoRole : (i === 1 ? 'collaborator' : 'member'),
    }));
    return Promise.resolve({ communities });
  }
  return apiClient.get('/communities', { params: { mine: true } });
}

export async function createCommunity(communityData) {
  return apiClient.post('/communities', communityData);
}

export async function getCommunity(slug) {
  return apiClient.get('/communities', { params: { slug } });
}

/** Single call for detail page: community + places + events (no waterfall) */
export async function getCommunityDetail(slug) {
  if (isDemoMode()) {
    const data = getMockCommunityDetail(slug);
    if (data) {
      if (data.community?.id === 'comm-demo') {
        try {
          const stored = localStorage.getItem('demoUser');
          const demoUser = stored ? JSON.parse(stored) : null;
          data.community.role = demoUser?.role === 'host' ? 'owner' : 'collaborator';
        } catch {
          data.community.role = 'collaborator';
        }
      }
      return Promise.resolve(data);
    }
  }
  return apiClient.get('/communities', { params: { slug, include: 'places,events' } });
}

export async function getPublicCommunities(options = {}) {
  const params = { ...options };
  return apiClient.get('/communities', { params });
}

export async function getCommunityLinkRequests(communityId) {
  if (isDemoMode() && communityId === 'comm-demo') {
    return Promise.resolve({ requests: [] });
  }
  return apiClient.get('/community-link-requests', { params: { communityId } });
}

export async function createCommunityLinkRequest(data) {
  return apiClient.post('/community-link-requests', data);
}

export async function approveCommunityLinkRequest(requestId, status) {
  return apiClient.patch('/community-link-requests', { requestId, status });
}

export async function updateCommunity(slug, data) {
  return apiClient.patch('/communities', data, { params: { slug } });
}

export async function deleteCommunity(slug) {
  return apiClient.delete('/communities', { params: { slug } });
}

/** Community admin: members, join requests, invite, remove */
export async function getCommunityMembers(communityId) {
  if (isDemoMode() && communityId === 'comm-demo') {
    const members = DEMO_COMMUNITY_MEMBERS.map((m, i) => ({
      ...m,
      userId: m.id,
      avatarUrl: getDemoMemberAvatarUrl(m.id),
      joinedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    }));
    return Promise.resolve({ members });
  }
  return apiClient.get('/community-admin', { params: { communityId, members: true } });
}

export async function getCommunityJoinRequests(communityId) {
  if (isDemoMode() && communityId === 'comm-demo') {
    return Promise.resolve({ requests: [] });
  }
  return apiClient.get('/community-admin', { params: { communityId, joinRequests: true } });
}

export async function getCommunityInvites(communityId) {
  return apiClient.get('/community-admin', { params: { communityId, invites: true } });
}

export async function approveJoinRequest(communityId, requestId) {
  return apiClient.post('/community-admin', { action: 'approve-join', requestId }, { params: { communityId } });
}

export async function rejectJoinRequest(communityId, requestId) {
  return apiClient.post('/community-admin', { action: 'reject-join', requestId }, { params: { communityId } });
}

export async function removeCommunityMember(communityId, userId) {
  return apiClient.post('/community-admin', { action: 'remove-member', userId }, { params: { communityId } });
}

export async function inviteToCommunity(communityId, email) {
  return apiClient.post('/community-admin', { action: 'invite', email }, { params: { communityId } });
}/** Request to join a community (user action) */
export async function requestToJoinCommunity(communityId) {
  return apiClient.post('/community-join', { communityId });
}
