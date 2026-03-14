/**
 * Mock data for Unified Availability Engine (demo mode)
 * Provides realistic availability data for demo users, venues, and communities
 */

import { DEMO_COMMUNITY_ID } from './communities';
import { DEMO_COMMUNITY_MEMBERS } from './users';

// In-memory stores for demo availability (can be modified in UI)
const demoProfiles = new Map();
let demoSlots = [];
let demoOverrides = [];

// Initialize demo data
function initializeDemoData() {
  // Demo User (demo-user-1) - Available Monday-Friday mornings and evenings
  const demoUserProfileId = 'profile-demo-user-1';
  demoProfiles.set('USER-demo-user-1', {
    id: demoUserProfileId,
    ownerType: 'USER',
    ownerId: 'demo-user-1',
    timezone: 'Australia/Sydney',
  });
  // Monday-Friday mornings
  for (let day = 1; day <= 5; day++) {
    demoSlots.push({
      id: `slot-user-${day}-morning`,
      profileId: demoUserProfileId,
      date: null,
      dayOfWeek: day,
      period: 'MORNING',
      startTime: '09:00',
      endTime: '12:00',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
    });
  }
  // Monday, Wednesday, Friday evenings
  [1, 3, 5].forEach((day) => {
    demoSlots.push({
      id: `slot-user-${day}-evening`,
      profileId: demoUserProfileId,
      date: null,
      dayOfWeek: day,
      period: 'EVENING',
      startTime: '18:00',
      endTime: '21:00',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
    });
  });

  // Demo Host (demo-host-1) - Available weekdays 9am-5pm
  const demoHostProfileId = 'profile-demo-host-1';
  demoProfiles.set('USER-demo-host-1', {
    id: demoHostProfileId,
    ownerType: 'USER',
    ownerId: 'demo-host-1',
    timezone: 'Australia/Sydney',
  });
  for (let day = 1; day <= 5; day++) {
    demoSlots.push({
      id: `slot-host-${day}-custom`,
      profileId: demoHostProfileId,
      date: null,
      dayOfWeek: day,
      period: 'CUSTOM',
      startTime: '09:00',
      endTime: '17:00',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
    });
  }

  // Demo Community Members - Random availability patterns
  DEMO_COMMUNITY_MEMBERS.forEach((member, idx) => {
    const profileId = `profile-user-${member.id}`;
    demoProfiles.set(`USER-${member.id}`, {
      id: profileId,
      ownerType: 'USER',
      ownerId: member.id,
      timezone: 'Australia/Sydney',
    });

    // Each member has different availability patterns
    const patterns = [
      { days: [1, 3, 5], periods: ['MORNING', 'AFTERNOON'] }, // Mon/Wed/Fri mornings and afternoons
      { days: [2, 4], periods: ['AFTERNOON', 'EVENING'] }, // Tue/Thu afternoons and evenings
      { days: [0, 6], periods: ['MORNING', 'AFTERNOON', 'EVENING'] }, // Weekends all day
      { days: [1, 2, 3, 4, 5], periods: ['EVENING'] }, // Weekday evenings
      { days: [0, 1, 2, 3, 4, 5, 6], periods: ['MORNING'] }, // Every morning
    ];

    const pattern = patterns[idx % patterns.length];
    pattern.days.forEach((day) => {
      pattern.periods.forEach((period) => {
        const times = {
          MORNING: { start: '09:00', end: '12:00' },
          AFTERNOON: { start: '12:00', end: '17:00' },
          EVENING: { start: '17:00', end: '21:00' },
        };
        demoSlots.push({
          id: `slot-${member.id}-${day}-${period}`,
          profileId,
          date: null,
          dayOfWeek: day,
          period,
          startTime: times[period].start,
          endTime: times[period].end,
          status: 'AVAILABLE',
          createdAt: new Date().toISOString(),
        });
      });
    });
  });

  // Demo Venue 1 (space-demo-1) - Available weekdays 9am-6pm
  const venue1ProfileId = 'profile-venue-space-demo-1';
  demoProfiles.set('VENUE-space-demo-1', {
    id: venue1ProfileId,
    ownerType: 'VENUE',
    ownerId: 'space-demo-1',
    timezone: 'Australia/Sydney',
  });
  for (let day = 1; day <= 5; day++) {
    demoSlots.push({
      id: `slot-venue1-${day}`,
      profileId: venue1ProfileId,
      date: null,
      dayOfWeek: day,
      period: 'CUSTOM',
      startTime: '09:00',
      endTime: '18:00',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
    });
  }
  // Add some booked dates
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  demoOverrides.push({
    id: 'override-venue1-booked-1',
    profileId: venue1ProfileId,
    date: nextWeek.toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '14:00',
    status: 'BOOKED',
    notes: 'Workshop booking',
    createdAt: new Date().toISOString(),
  });

  // Demo Venue 2 (space-demo-2) - Available weekends 10am-8pm
  const venue2ProfileId = 'profile-venue-space-demo-2';
  demoProfiles.set('VENUE-space-demo-2', {
    id: venue2ProfileId,
    ownerType: 'VENUE',
    ownerId: 'space-demo-2',
    timezone: 'Australia/Sydney',
  });
  [0, 6].forEach((day) => {
    // Sunday and Saturday
    demoSlots.push({
      id: `slot-venue2-${day}`,
      profileId: venue2ProfileId,
      date: null,
      dayOfWeek: day,
      period: 'CUSTOM',
      startTime: '10:00',
      endTime: '20:00',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
    });
  });
  // Add blocked date
  const nextSat = new Date();
  nextSat.setDate(nextSat.getDate() + (6 - nextSat.getDay()));
  demoOverrides.push({
    id: 'override-venue2-blocked-1',
    profileId: venue2ProfileId,
    date: nextSat.toISOString().split('T')[0],
    startTime: '00:00',
    endTime: '23:59',
    status: 'BLOCKED',
    notes: 'Maintenance',
    createdAt: new Date().toISOString(),
  });

  // Facilitators (fac-1 .. fac-4) - USER profiles for booking/scheduling intelligence
  const facilitatorIds = ['fac-1', 'fac-2', 'fac-3', 'fac-4'];
  facilitatorIds.forEach((fid) => {
    const profileId = `profile-user-${fid}`;
    demoProfiles.set(`USER-${fid}`, {
      id: profileId,
      ownerType: 'USER',
      ownerId: fid,
      timezone: 'Australia/Sydney',
    });
    for (let day = 1; day <= 5; day++) {
      demoSlots.push({
        id: `slot-${fid}-${day}`,
        profileId,
        date: null,
        dayOfWeek: day,
        period: 'CUSTOM',
        startTime: '09:00',
        endTime: '17:00',
        status: 'AVAILABLE',
        createdAt: new Date().toISOString(),
      });
    }
  });
}

// Initialize on first import
initializeDemoData();

// ============================================================================
// Profile Functions
// ============================================================================

export function getMockAvailabilityProfile(ownerType, ownerId) {
  const key = `${ownerType}-${ownerId}`;
  return demoProfiles.get(key) || null;
}

export function createMockAvailabilityProfile(ownerType, ownerId, timezone = 'Australia/Sydney') {
  const key = `${ownerType}-${ownerId}`;
  const profileId = `profile-${ownerType.toLowerCase()}-${ownerId}`;
  const profile = {
    id: profileId,
    ownerType,
    ownerId,
    timezone,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  demoProfiles.set(key, profile);
  return profile;
}

// ============================================================================
// Slot Functions
// ============================================================================

export function getMockAvailabilitySlots(profileId, filters = {}) {
  let slots = demoSlots.filter((s) => s.profileId === profileId);
  if (filters.dayOfWeek !== undefined) {
    slots = slots.filter((s) => s.dayOfWeek === filters.dayOfWeek);
  }
  if (filters.date) {
    slots = slots.filter((s) => s.date === filters.date);
  }
  if (filters.period) {
    slots = slots.filter((s) => s.period === filters.period);
  }
  return slots;
}

export function createMockAvailabilitySlot(slotData) {
  const slot = {
    id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    profileId: slotData.profileId,
    date: slotData.date || null,
    dayOfWeek: slotData.dayOfWeek !== undefined ? slotData.dayOfWeek : null,
    period: slotData.period,
    startTime: slotData.startTime,
    endTime: slotData.endTime,
    status: slotData.status || 'AVAILABLE',
    createdAt: new Date().toISOString(),
  };
  demoSlots.push(slot);
  return slot;
}

export function deleteMockAvailabilitySlot(slotId) {
  demoSlots = demoSlots.filter((s) => s.id !== slotId);
}

// ============================================================================
// Override Functions
// ============================================================================

export function getMockAvailabilityOverrides(profileId, filters = {}) {
  let overrides = demoOverrides.filter((o) => o.profileId === profileId);
  if (filters.date) {
    overrides = overrides.filter((o) => o.date === filters.date);
  }
  if (filters.status) {
    overrides = overrides.filter((o) => o.status === filters.status);
  }
  return overrides;
}

export function createMockAvailabilityOverride(overrideData) {
  const override = {
    id: `override-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    profileId: overrideData.profileId,
    date: overrideData.date,
    startTime: overrideData.startTime,
    endTime: overrideData.endTime,
    status: overrideData.status,
    notes: overrideData.notes || null,
    createdAt: new Date().toISOString(),
  };
  demoOverrides.push(override);
  return override;
}

export function deleteMockAvailabilityOverride(overrideId) {
  demoOverrides = demoOverrides.filter((o) => o.id !== overrideId);
}

// ============================================================================
// Community Heatmap Functions
// ============================================================================

export function getMockCommunityHeatmap(communityId) {
  // Get all members of the community
  const members = DEMO_COMMUNITY_MEMBERS;
  const heatmap = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = ['MORNING', 'AFTERNOON', 'EVENING'];

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    for (const period of periods) {
      const availableUsers = [];
      let availableCount = 0;

      members.forEach((member) => {
        const profile = getMockAvailabilityProfile('USER', member.id);
        if (profile) {
          const slots = getMockAvailabilitySlots(profile.id, { dayOfWeek, period });
          if (slots.length > 0) {
            availableUsers.push({
              id: member.id,
              fullName: member.fullName,
              email: member.email,
            });
            availableCount++;
          }
        }
      });

      const percentage = members.length > 0 ? Math.round((availableCount / members.length) * 100) : 0;

      heatmap.push({
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        period,
        availableCount,
        totalMembers: members.length,
        percentage,
        availableUsers,
      });
    }
  }

  return { heatmap, totalMembers: members.length };
}

// ============================================================================
// Venue Availability Functions
// ============================================================================

export function getMockVenueAvailability(venueId) {
  const profile = getMockAvailabilityProfile('VENUE', venueId);
  if (!profile) {
    return {
      profile: null,
      slots: [],
      overrides: [],
      conflicts: [],
      available: false,
    };
  }

  const slots = getMockAvailabilitySlots(profile.id);
  const overrides = getMockAvailabilityOverrides(profile.id);

  return {
    profile,
    slots,
    overrides,
    conflicts: overrides.filter((o) => o.status === 'BOOKED' || o.status === 'BLOCKED'),
    available: true,
  };
}

export function checkMockVenueAvailability(venueId, date, startTime, endTime) {
  const profile = getMockAvailabilityProfile('VENUE', venueId);
  if (!profile) {
    return { available: false, conflicts: [], matchingSlots: [] };
  }

  const dayOfWeek = new Date(date).getDay();
  const allSlots = getMockAvailabilitySlots(profile.id);
  // Recurring: dayOfWeek match and no date. One-off: slot.date === date.
  const daySlots = allSlots.filter(
    (s) => (s.date != null && s.date === date) || (s.date == null && s.dayOfWeek === dayOfWeek)
  );
  const overrides = getMockAvailabilityOverrides(profile.id, { date });

  const conflicts = overrides.filter((o) => {
    return (
      (o.startTime <= endTime && o.endTime >= startTime) ||
      (o.status === 'BLOCKED' && o.startTime === '00:00' && o.endTime === '23:59')
    );
  });

  const matchingSlots = daySlots.filter(
    (slot) => slot.startTime <= startTime && slot.endTime >= endTime
  );

  return {
    available: matchingSlots.length > 0 && conflicts.length === 0,
    conflicts,
    matchingSlots,
  };
}

/**
 * Get bookable time slots for a venue on a date (Calendly-style).
 * Returns slots in the given increment that fit within availability and duration.
 * @param {string} venueId
 * @param {string} date - YYYY-MM-DD
 * @param {Object} options - { durationMinutes?: number, incrementMinutes?: number }
 * @returns {{ slots: Array<{ startTime: string, endTime: string }> }}
 */
export function getMockVenueAvailabilitySlots(venueId, date, options = {}) {
  const durationMinutes = options.durationMinutes ?? 60;
  const incrementMinutes = options.incrementMinutes ?? 30;

  const profile = getMockAvailabilityProfile('VENUE', venueId);
  if (!profile) return { slots: [] };

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const allSlots = getMockAvailabilitySlots(profile.id);
  const daySlots = allSlots.filter(
    (s) => (s.date != null && s.date === date) || (s.date == null && s.dayOfWeek === dayOfWeek)
  );
  const overrides = getMockAvailabilityOverrides(profile.id, { date });
  const blocked = overrides.some((o) => o.status === 'BLOCKED' && o.startTime === '00:00' && o.endTime === '23:59');
  if (blocked || daySlots.length === 0) return { slots: [] };

  const toMinutes = (t) => {
    const [h, m] = (t || '00:00').slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };
  const fromMinutes = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  const blockedRanges = overrides
    .filter((o) => o.status === 'BLOCKED')
    .map((o) => ({ start: toMinutes(o.startTime), end: toMinutes(o.endTime) }));

  const ranges = [];
  for (const slot of daySlots) {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    const parts = [{ start, end }];
    for (const b of blockedRanges) {
      const next = [];
      for (const p of parts) {
        if (b.end <= p.start || b.start >= p.end) {
          next.push(p);
        } else {
          if (p.start < b.start) next.push({ start: p.start, end: b.start });
          if (b.end < p.end) next.push({ start: b.end, end: p.end });
        }
      }
      parts.length = 0;
      parts.push(...next);
    }
    ranges.push(...parts);
  }

  const merged = [];
  for (const r of ranges.sort((a, b) => a.start - b.start)) {
    if (merged.length && merged[merged.length - 1].end >= r.start) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  const slots = [];
  const dayStart = toMinutes('00:00');
  const dayEnd = toMinutes('23:59');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nowMinutes = date === todayStr ? now.getHours() * 60 + now.getMinutes() : -1;

  for (const range of merged) {
    let t = Math.ceil((range.start - dayStart) / incrementMinutes) * incrementMinutes + dayStart;
    if (t < range.start) t = range.start;
    while (t + durationMinutes <= range.end && t < dayEnd) {
      if (nowMinutes < 0 || t >= nowMinutes + (options.minNoticeMinutes ?? 0)) {
        slots.push({
          startTime: fromMinutes(t),
          endTime: fromMinutes(t + durationMinutes),
        });
      }
      t += incrementMinutes;
    }
  }

  return { slots };
}

// ============================================================================
// User Availability (same shape as venue)
// ============================================================================

export function getMockUserAvailability(userId) {
  const profile = getMockAvailabilityProfile('USER', userId);
  if (!profile) {
    return {
      profile: null,
      slots: [],
      overrides: [],
      conflicts: [],
      available: false,
    };
  }
  const slots = getMockAvailabilitySlots(profile.id);
  const overrides = getMockAvailabilityOverrides(profile.id);
  return {
    profile,
    slots,
    overrides,
    conflicts: overrides.filter((o) => o.status === 'BOOKED' || o.status === 'BLOCKED'),
    available: true,
  };
}

export function checkMockUserAvailability(userId, date, startTime, endTime) {
  const profile = getMockAvailabilityProfile('USER', userId);
  if (!profile) {
    return { available: false, conflicts: [], matchingSlots: [] };
  }
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const allSlots = getMockAvailabilitySlots(profile.id);
  const daySlots = allSlots.filter(
    (s) => (s.date != null && s.date === date) || (s.date == null && s.dayOfWeek === dayOfWeek)
  );
  const overrides = getMockAvailabilityOverrides(profile.id, { date });
  const conflicts = overrides.filter((o) => {
    const oStart = (o.startTime || '00:00').slice(0, 5);
    const oEnd = (o.endTime || '23:59').slice(0, 5);
    return (
      (oStart <= endTime && oEnd >= startTime) ||
      (o.status === 'BLOCKED' && o.startTime === '00:00' && o.endTime === '23:59')
    );
  });
  const matchingSlots = daySlots.filter(
    (slot) => slot.startTime <= startTime && slot.endTime >= endTime
  );
  return {
    available: matchingSlots.length > 0 && conflicts.length === 0,
    conflicts,
    matchingSlots,
  };
}

export function getMockUserAvailabilitySlots(userId, date, options = {}) {
  const profile = getMockAvailabilityProfile('USER', userId);
  if (!profile) return { slots: [] };
  const durationMinutes = options.durationMinutes ?? 60;
  const incrementMinutes = options.incrementMinutes ?? 30;

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const allSlots = getMockAvailabilitySlots(profile.id);
  const daySlots = allSlots.filter(
    (s) => (s.date != null && s.date === date) || (s.date == null && s.dayOfWeek === dayOfWeek)
  );
  const overrides = getMockAvailabilityOverrides(profile.id, { date });
  const blockedFullDay = overrides.some((o) => o.status === 'BLOCKED' && o.startTime === '00:00' && o.endTime === '23:59');
  if (blockedFullDay || daySlots.length === 0) return { slots: [] };

  const toMinutes = (t) => {
    const [h, m] = (t || '00:00').slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };
  const fromMinutes = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };
  const blockedRanges = overrides
    .filter((o) => o.status === 'BLOCKED')
    .map((o) => ({ start: toMinutes(o.startTime), end: toMinutes(o.endTime) }));

  const ranges = [];
  for (const slot of daySlots) {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    const parts = [{ start, end }];
    for (const b of blockedRanges) {
      const next = [];
      for (const p of parts) {
        if (b.end <= p.start || b.start >= p.end) next.push(p);
        else {
          if (p.start < b.start) next.push({ start: p.start, end: b.start });
          if (b.end < p.end) next.push({ start: b.end, end: p.end });
        }
      }
      parts.length = 0;
      parts.push(...next);
    }
    ranges.push(...parts);
  }
  const merged = [];
  for (const r of ranges.sort((a, b) => a.start - b.start)) {
    if (merged.length && merged[merged.length - 1].end >= r.start) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    } else merged.push({ ...r });
  }

  const slots = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nowMinutes = date === todayStr ? now.getHours() * 60 + now.getMinutes() : -1;
  const minNotice = options.minNoticeMinutes ?? 0;

  for (const range of merged) {
    let t = Math.ceil(range.start / incrementMinutes) * incrementMinutes;
    if (t < range.start) t = range.start;
    while (t + durationMinutes <= range.end) {
      if (nowMinutes < 0 || t >= nowMinutes + minNotice) {
        slots.push({
          startTime: fromMinutes(t),
          endTime: fromMinutes(t + durationMinutes),
        });
      }
      t += incrementMinutes;
    }
  }
  return { slots };
}

// ============================================================================
// Availability by time window (which dates in range have window available)
// ============================================================================

function getMockAvailabilityByWindow(ownerType, ownerId, dateFrom, dateTo, startTime, endTime) {
  const check = ownerType === 'VENUE' ? checkMockVenueAvailability : checkMockUserAvailability;
  const dates = [];
  const from = new Date(dateFrom + 'T12:00:00');
  const to = new Date(dateTo + 'T12:00:00');
  const day = new Date(from);
  while (day <= to) {
    const dateStr = day.toISOString().split('T')[0];
    const result = check(ownerId, dateStr, startTime, endTime);
    if (result.available) dates.push(dateStr);
    day.setDate(day.getDate() + 1);
  }
  return { dates };
}

export function getMockVenueAvailabilityByWindow(venueId, dateFrom, dateTo, startTime, endTime) {
  return getMockAvailabilityByWindow('VENUE', venueId, dateFrom, dateTo, startTime, endTime);
}

export function getMockUserAvailabilityByWindow(userId, dateFrom, dateTo, startTime, endTime) {
  return getMockAvailabilityByWindow('USER', userId, dateFrom, dateTo, startTime, endTime);
}

// ============================================================================
// Event combined (venue + host + facilitators)
// ============================================================================

export function checkMockEventAvailability({ venueId, hostId, facilitatorIds = [], date, startTime, endTime }) {
  const result = { available: true };
  if (venueId) {
    const v = checkMockVenueAvailability(venueId, date, startTime, endTime);
    result.venueAvailable = v.available;
    if (!v.available) result.available = false;
  }
  if (hostId) {
    const h = checkMockUserAvailability(hostId, date, startTime, endTime);
    result.hostAvailable = h.available;
    if (!h.available) result.available = false;
  }
  if (facilitatorIds && facilitatorIds.length > 0) {
    result.facilitatorsAvailable = {};
    let atLeastOne = false;
    facilitatorIds.forEach((fid) => {
      const f = checkMockUserAvailability(fid, date, startTime, endTime);
      result.facilitatorsAvailable[fid] = f.available;
      if (f.available) atLeastOne = true;
    });
    if (!atLeastOne) result.available = false;
  }
  return result;
}

function slotRangesToMinutes(slots) {
  return slots.map((s) => ({
    start: (() => {
      const [h, m] = (s.startTime || '00:00').slice(0, 5).split(':').map(Number);
      return h * 60 + m;
    })(),
    end: (() => {
      const [h, m] = (s.endTime || '00:00').slice(0, 5).split(':').map(Number);
      return h * 60 + m;
    })(),
  }));
}

function intersectSlotRanges(rangesA, rangesB) {
  if (!rangesA.length || !rangesB.length) return [];
  const out = [];
  for (const a of rangesA) {
    for (const b of rangesB) {
      const start = Math.max(a.start, b.start);
      const end = Math.min(a.end, b.end);
      if (start < end) out.push({ start, end });
    }
  }
  return out.sort((x, y) => x.start - y.start);
}

function unionSlotRanges(ranges) {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [];
  for (const r of sorted) {
    if (merged.length && merged[merged.length - 1].end >= r.start) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

function rangesToDiscreteSlots(ranges, durationMinutes, incrementMinutes, minNoticeMinutes, date) {
  const fromMinutes = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nowMinutes = date === todayStr ? now.getHours() * 60 + now.getMinutes() : -1;
  const slots = [];
  for (const range of ranges) {
    let t = Math.ceil(range.start / incrementMinutes) * incrementMinutes;
    if (t < range.start) t = range.start;
    while (t + durationMinutes <= range.end) {
      if (nowMinutes < 0 || t >= nowMinutes + (minNoticeMinutes || 0)) {
        slots.push({
          startTime: fromMinutes(t),
          endTime: fromMinutes(t + durationMinutes),
        });
      }
      t += incrementMinutes;
    }
  }
  return slots;
}

export function getMockEventAvailabilitySlots({
  venueId,
  hostId,
  facilitatorIds = [],
  date,
  durationMinutes = 60,
  incrementMinutes = 30,
  minNoticeMinutes = 0,
  minFacilitators = 0,
}) {
  let ranges = null;

  if (venueId) {
    const res = getMockVenueAvailabilitySlots(venueId, date, { durationMinutes, incrementMinutes, minNoticeMinutes });
    ranges = slotRangesToMinutes(res.slots || []);
    if (!ranges.length) return { slots: [] };
  }

  if (hostId) {
    const res = getMockUserAvailabilitySlots(hostId, date, { durationMinutes, incrementMinutes, minNoticeMinutes });
    const hostRanges = slotRangesToMinutes(res.slots || []);
    if (!hostRanges.length) return { slots: [] };
    ranges = ranges ? intersectSlotRanges(ranges, hostRanges) : hostRanges;
    if (!ranges.length) return { slots: [] };
  }

  if (facilitatorIds && facilitatorIds.length > 0) {
    let facilitatorRanges = [];
    for (const fid of facilitatorIds) {
      const res = getMockUserAvailabilitySlots(fid, date, { durationMinutes, incrementMinutes, minNoticeMinutes });
      facilitatorRanges = facilitatorRanges.concat(slotRangesToMinutes(res.slots || []));
    }
    facilitatorRanges = unionSlotRanges(facilitatorRanges);
    if (minFacilitators >= 1 && facilitatorRanges.length === 0) return { slots: [] };
    ranges = ranges ? intersectSlotRanges(ranges, facilitatorRanges) : facilitatorRanges;
    if (!ranges.length) return { slots: [] };
  }

  if (!ranges || !ranges.length) return { slots: [] };
  const slots = rangesToDiscreteSlots(ranges, durationMinutes, incrementMinutes, minNoticeMinutes, date);
  return { slots };
}
