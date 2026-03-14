import apiClient from './client';

// User endpoints
export const submitHostApplication = (applicationData) => {
  return apiClient.post('/host-applications', applicationData);
};

export const getMyApplicationStatus = () => {
  return apiClient.get('/host-applications', { params: { me: true } });
};

// Admin endpoints
export const getAllApplications = (status) => {
  return apiClient.get('/host-applications', { params: { status } });
};

export const reviewApplication = (id, decision) => {
  return apiClient.patch('/host-applications', {
    status: decision, // 'approved' or 'rejected'
  }, { params: { id } });
};
