import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventsAPI from '@/api/events';
import apiClient from '@/api/client';

vi.mock('@/api/client');

describe('Events API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyEvents', () => {
    it('should fetch user events', async () => {
      const mockEvents = [{ id: '1', title: 'Event 1' }];
      apiClient.get = vi.fn().mockResolvedValue({ data: { events: mockEvents } });

      const result = await eventsAPI.getMyEvents();

      expect(apiClient.get).toHaveBeenCalledWith('/events', { params: { mine: true } });
      expect(result.data.events).toEqual(mockEvents);
    });

    it('should handle API errors', async () => {
      apiClient.get = vi.fn().mockRejectedValue(new Error('API Error'));

      await expect(eventsAPI.getMyEvents()).rejects.toThrow('API Error');
    });
  });

  describe('getEvent', () => {
    it('should fetch single event by id', async () => {
      const mockEvent = { id: '1', title: 'Event 1' };
      apiClient.get = vi.fn().mockResolvedValue({ data: { event: mockEvent } });

      const result = await eventsAPI.getEvent('1');

      expect(apiClient.get).toHaveBeenCalledWith('/events', { params: { id: '1' } });
      expect(result.data.event).toEqual(mockEvent);
    });
  });

  describe('createEvent', () => {
    it('should create new event', async () => {
      const eventData = {
        title: 'New Event',
        startAt: '2026-12-25T10:00:00Z',
      };
      const mockResponse = { id: '1', ...eventData };
      apiClient.post = vi.fn().mockResolvedValue({ data: { event: mockResponse } });

      const result = await eventsAPI.createEvent(eventData);

      expect(apiClient.post).toHaveBeenCalledWith('/events', eventData);
      expect(result.data.event).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const eventData = { title: '' };
      apiClient.post = vi.fn().mockRejectedValue({
        response: { data: { message: 'Title is required' } },
      });

      await expect(eventsAPI.createEvent(eventData)).rejects.toThrow();
    });
  });

  describe('updateEvent', () => {
    it('should update event', async () => {
      const updateData = { title: 'Updated Event' };
      const mockResponse = { id: '1', ...updateData };
      apiClient.patch = vi.fn().mockResolvedValue({ data: { event: mockResponse } });

      const result = await eventsAPI.updateEvent('1', updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/events', updateData, {
        params: { id: '1' },
      });
      expect(result.data.event).toEqual(mockResponse);
    });
  });

  describe('deleteEvent', () => {
    it('should delete event', async () => {
      apiClient.delete = vi.fn().mockResolvedValue({ data: { success: true } });

      await eventsAPI.deleteEvent('1');

      expect(apiClient.delete).toHaveBeenCalledWith('/events', { params: { id: '1' } });
    });
  });
});
