import apiClient from './client';

// Spaces
export const getSpaces = (filters = {}) => {
  return apiClient.get('/spaces', { params: filters });
};

export const getSpacesById = (id) => {
  return apiClient.get(`/spaces/${id}`);
};

export const createSpace = (spaceData) => {
  return apiClient.post('/spaces', spaceData);
};

export const updateSpace = (id, spaceData) => {
  return apiClient.patch(`/spaces/${id}`, spaceData);
};
export const deleteSpace = (id) => {
  return apiClient.delete(`/spaces/${id}`);
};

// Events
export const getEvents = (filters = {}) => {
  return apiClient.get('/events', { params: filters });
};

export const getEventsById = (id) => {
  return apiClient.get(`/events/${id}`);
};

export const createEvent = (eventData) => {
  return apiClient.post('/events', eventData);
};

export const updateEvent = (id, eventData) => {
  return apiClient.patch(`/events/${id}`, eventData);
};
export const deleteEvent = (id) => {
  return apiClient.delete(`/events/${id}`);
};
