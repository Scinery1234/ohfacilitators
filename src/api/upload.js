import apiClient from './client';

export const uploadImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      apiClient
        .post('/upload', { file: base64, filename: file.name })
        .then((data) => resolve(data.url))
        .catch(reject);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
