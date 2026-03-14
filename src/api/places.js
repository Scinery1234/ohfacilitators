import apiClient from './client';
import { isDemoToken } from '@/mocks/users';
import { mockSpaces } from '@/mocks/spaces';
import { getMockVenueDetail } from '@/mocks/venues';

function isDemoMode() {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;
  return isDemoToken(token);
}

/** Map mock space to API place shape for "my places" */
function mockSpaceToPlace(s) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    address: s.address || s.locationArea,
    creatorName: s.host?.name ?? null,
    createdBy: s.host?.id,
    imageUrl: s.images?.[0] ?? null,
    visibility: 'public',
  };
}

export async function getMyPlaces() {
  if (isDemoMode()) {
    const places = mockSpaces
      .filter((s) => s.host?.id === 'demo-host-1')
      .map(mockSpaceToPlace);
    // Return in same format as API: { places: [...] }
    return Promise.resolve({ places });
  }
  return apiClient.get('/places', { params: { mine: true } });
}

export async function getPlacesInMyCommunities() {
  if (isDemoMode()) {
    // Return places from demo community (comm-demo) - spaces linked to demo community
    const demoPlaces = mockSpaces
      .filter((s) => s.id === 'space-demo-1' || s.id === 'space-demo-2')
      .map(mockSpaceToPlace);
    // Return in same format as API: { places: [...] }
    return Promise.resolve({ places: demoPlaces });
  }
  return apiClient.get('/places', { params: { scope: 'my-communities' } });
}

export async function getPlace(id) {
  if (isDemoMode()) {
    const mock = getMockVenueDetail(id);
    if (mock?.place) {
      const place = {
        ...mock.place,
        visibility: mock.place.visibility || 'public',
        imageUrl: mock.place.images?.[0] ?? mock.place.imageUrl,
      };
      try {
        const stored = localStorage.getItem('demoUser');
        const u = stored ? JSON.parse(stored) : null;
        if (u?.id === place.createdBy) place.role = 'owner';
      } catch {
        // use place as-is
      }
      return Promise.resolve({ place });
    }
  }
  return apiClient.get('/places', { params: { id } });
}

export async function getPublicPlaces(params = {}) {
  return apiClient.get('/places', { params });
}

export async function createPlace(placeData) {
  return apiClient.post('/places', placeData);
}

export async function updatePlace(id, placeData) {
  return apiClient.patch('/places', placeData, { params: { id } });
}

export async function deletePlace(id) {
  return apiClient.delete('/places', { params: { id } });
}
