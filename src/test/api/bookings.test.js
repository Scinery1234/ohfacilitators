import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bookingsAPI from '@/api/bookings';
import apiClient from '@/api/client';

vi.mock('@/api/client');

describe('Bookings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should create new booking', async () => {
      const bookingData = {
        listingType: 'event',
        listingId: '1',
        startAt: '2026-12-25T10:00:00Z',
      };
      const mockResponse = { id: '1', ...bookingData };
      apiClient.post = vi.fn().mockResolvedValue({ data: { booking: mockResponse } });

      const result = await bookingsAPI.createBooking(bookingData);

      expect(apiClient.post).toHaveBeenCalledWith('/bookings', bookingData);
      expect(result.data.booking).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const bookingData = { listingType: 'event' };
      apiClient.post = vi.fn().mockRejectedValue({
        response: { data: { message: 'Listing ID is required' } },
      });

      await expect(bookingsAPI.createBooking(bookingData)).rejects.toThrow();
    });
  });

  describe('getMyBooking', () => {
    it('should fetch user bookings', async () => {
      const mockBookings = [
        {
          id: '1',
          listingType: 'event',
          listingId: '1',
          status: 'confirmed',
        },
      ];
      apiClient.get = vi.fn().mockResolvedValue({ data: { bookings: mockBookings } });

      const result = await bookingsAPI.getMyBooking();

      expect(apiClient.get).toHaveBeenCalledWith('/bookings', { params: { scope: 'mine' } });
      expect(result.data.bookings).toEqual(mockBookings);
    });

    it('should fetch host bookings when scope is host', async () => {
      const mockBookings = [{ id: '1', status: 'pending' }];
      apiClient.get = vi.fn().mockResolvedValue({ data: { bookings: mockBookings } });

      const result = await bookingsAPI.getMyBooking('host');

      expect(apiClient.get).toHaveBeenCalledWith('/bookings', { params: { scope: 'host' } });
      expect(result.data.bookings).toEqual(mockBookings);
    });
  });

  describe('updateBooking', () => {
    it('should update booking', async () => {
      const updateData = { status: 'cancelled' };
      const mockResponse = { id: '1', ...updateData };
      apiClient.patch = vi.fn().mockResolvedValue({ data: { booking: mockResponse } });

      const result = await bookingsAPI.updateBooking('1', updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/bookings', updateData, {
        params: { id: '1' },
      });
      expect(result.data.booking).toEqual(mockResponse);
    });
  });
});
