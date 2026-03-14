import apiClient from './client';

// Authentication
export const register = (userData) => {
  return apiClient.post('/auth/register', userData);
};

export const login = (credentials) => {
  return apiClient.post('/auth/login', credentials);
};

// User profile management
export const getMe = () => {
  return apiClient.get('/user/profile');
};

export const updateProfile = (userData) => {
  return apiClient.patch('/user/profile', userData);
};

export const updateMe = (userData) => {
  return apiClient.patch('/users/me', userData);
};

export const deleteMe = () => {
  return apiClient.delete('/users/me');
};

// Admin Only update of user role (user -> host)
export const updateUserRole = (userId, role) => {
  return apiClient.patch(`/users/${userId}/role`, { role });
};
