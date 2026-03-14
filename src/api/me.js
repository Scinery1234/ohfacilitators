import apiClient from './client';

export async function getNavCounts() {
  return apiClient.get('/user/profile?counts=true');
}
