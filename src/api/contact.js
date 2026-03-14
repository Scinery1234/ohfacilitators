import apiClient from './client';

export async function submitContactForm(formData) {
  return apiClient.post('/contact', formData);
}
