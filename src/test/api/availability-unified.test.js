import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getEventAvailabilitySlots,
  checkEventAvailability,
  getVenueAvailabilitySlots,
  getUserAvailabilitySlots,
  getVenueAvailabilityByWindow,
} from '@/api/availability-unified';

const DEMO_TOKEN = 'demo:user';

describe('Availability unified API (demo mode)', () => {
  beforeEach(() => {
    localStorage.setItem('token', DEMO_TOKEN);
  });

  afterEach(() => {
    localStorage.removeItem('token');
  });

  describe('getEventAvailabilitySlots', () => {
    it('returns slots array when venue and host are provided', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      const dateStr = date.toISOString().split('T')[0];

      const result = await getEventAvailabilitySlots({
        venueId: 'space-demo-1',
        hostId: 'demo-user-1',
        date: dateStr,
        durationMinutes: 60,
        incrementMinutes: 30,
      });

      expect(result).toHaveProperty('slots');
      expect(Array.isArray(result.slots)).toBe(true);
      result.slots.forEach((slot) => {
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
      });
    });

    it('returns empty slots when no resources', async () => {
      const result = await getEventAvailabilitySlots({
        date: '2030-01-01',
        durationMinutes: 60,
      });
      expect(result.slots).toEqual([]);
    });
  });

  describe('checkEventAvailability', () => {
    it('returns available and per-resource flags', async () => {
      const result = await checkEventAvailability({
        venueId: 'space-demo-1',
        hostId: 'demo-user-1',
        date: '2030-06-15',
        startTime: '10:00',
        endTime: '11:00',
      });

      expect(result).toHaveProperty('available');
      expect(typeof result.available).toBe('boolean');
      if (result.venueAvailable !== undefined) expect(typeof result.venueAvailable).toBe('boolean');
      if (result.hostAvailable !== undefined) expect(typeof result.hostAvailable).toBe('boolean');
    });
  });

  describe('getVenueAvailabilitySlots', () => {
    it('returns slots for a venue on a date', async () => {
      const result = await getVenueAvailabilitySlots('space-demo-1', '2030-06-15', {
        durationMinutes: 60,
        incrementMinutes: 30,
      });
      expect(result).toHaveProperty('slots');
      expect(Array.isArray(result.slots)).toBe(true);
    });
  });

  describe('getUserAvailabilitySlots', () => {
    it('returns slots for a user on a date', async () => {
      const result = await getUserAvailabilitySlots('demo-user-1', '2030-06-15', {
        durationMinutes: 60,
        incrementMinutes: 30,
      });
      expect(result).toHaveProperty('slots');
      expect(Array.isArray(result.slots)).toBe(true);
    });
  });

  describe('getVenueAvailabilityByWindow', () => {
    it('returns dates when venue is available for time window', async () => {
      const result = await getVenueAvailabilityByWindow(
        'space-demo-1',
        '2030-06-01',
        '2030-06-07',
        '09:00',
        '17:00'
      );
      expect(result).toHaveProperty('dates');
      expect(Array.isArray(result.dates)).toBe(true);
    });
  });
});
