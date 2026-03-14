import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as placesAPI from '@/api/places';
import apiClient from '@/api/client';

vi.mock('@/api/client');

describe('Places API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyPlaces', () => {
    it('should fetch user places', async () => {
      const mockPlaces = [{ id: '1', title: 'Place 1' }];
      apiClient.get = vi.fn().mockResolvedValue({ data: { places: mockPlaces } });

      const result = await placesAPI.getMyPlaces();

      expect(apiClient.get).toHaveBeenCalledWith('/places', { params: { mine: true } });
      expect(result.data.places).toEqual(mockPlaces);
    });
  });

  describe('getPlace', () => {
    it('should fetch single place by id', async () => {
      const mockPlace = { id: '1', title: 'Place 1' };
      apiClient.get = vi.fn().mockResolvedValue({ data: { place: mockPlace } });

      const result = await placesAPI.getPlace('1');

      expect(apiClient.get).toHaveBeenCalledWith('/places', { params: { id: '1' } });
      expect(result.data.place).toEqual(mockPlace);
    });
  });

  describe('createPlace', () => {
    it('should create new place', async () => {
      const placeData = {
        title: 'New Place',
        address: '123 Main St',
      };
      const mockResponse = { id: '1', ...placeData };
      apiClient.post = vi.fn().mockResolvedValue({ data: { place: mockResponse } });

      const result = await placesAPI.createPlace(placeData);

      expect(apiClient.post).toHaveBeenCalledWith('/places', placeData);
      expect(result.data.place).toEqual(mockResponse);
    });
  });

  describe('updatePlace', () => {
    it('should update place', async () => {
      const updateData = { title: 'Updated Place' };
      const mockResponse = { id: '1', ...updateData };
      apiClient.patch = vi.fn().mockResolvedValue({ data: { place: mockResponse } });

      const result = await placesAPI.updatePlace('1', updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/places', updateData, {
        params: { id: '1' },
      });
      expect(result.data.place).toEqual(mockResponse);
    });
  });

  describe('deletePlace', () => {
    it('should delete place', async () => {
      apiClient.delete = vi.fn().mockResolvedValue({ data: { success: true } });

      await placesAPI.deletePlace('1');

      expect(apiClient.delete).toHaveBeenCalledWith('/places', { params: { id: '1' } });
    });
  });
});
