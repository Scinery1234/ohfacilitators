import apiClient from './client';

export async function geocodeAddress(address) {
  if (!address || typeof address !== 'string' || address.trim().length < 3) {
    return null;
  }
  const res = await apiClient.get('/geocode', { params: { address: address.trim() } });
  return res?.lat != null && res?.lng != null ? { lat: res.lat, lng: res.lng } : null;
}
