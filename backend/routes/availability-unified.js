/**
 * Unified Availability Engine Routes
 * Single engine for USER and VENUE availability
 */

import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// Helper: Get or create availability profile
function getOrCreateProfile(ownerType, ownerId) {
  let profile = db
    .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
    .get(ownerType, ownerId);

  if (!profile) {
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare(
      'INSERT INTO availability_profiles (id, ownerType, ownerId, timezone) VALUES (?, ?, ?, ?)'
    ).run(id, ownerType, ownerId, 'Australia/Sydney');
    profile = db.prepare('SELECT * FROM availability_profiles WHERE id = ?').get(id);
  }

  return profile;
}

// Helper: Parse time to minutes for comparison
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

// Helper: Check if time ranges overlap
function timeRangesOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && e1 > s2;
}

// ============================================================================
// PROFILE ENDPOINTS
// ============================================================================

/**
 * GET /api/availability/profile?ownerType=USER&ownerId=123
 * Get availability profile with slots and overrides
 */
router.get('/profile', (req, res) => {
  try {
    const { ownerType, ownerId } = req.query;

    if (!ownerType || !ownerId) {
      return res.status(400).json({ message: 'ownerType and ownerId are required' });
    }

    if (!['USER', 'VENUE'].includes(ownerType)) {
      return res.status(400).json({ message: 'ownerType must be USER or VENUE' });
    }

    const profile = db
      .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
      .get(ownerType, ownerId);

    if (!profile) {
      return res.json({ profile: null, slots: [], overrides: [] });
    }

    const slots = db
      .prepare('SELECT * FROM availability_slots WHERE profileId = ? ORDER BY dayOfWeek, startTime')
      .all(profile.id);

    const overrides = db
      .prepare('SELECT * FROM availability_overrides WHERE profileId = ? ORDER BY date, startTime')
      .all(profile.id);

    res.json({ profile, slots, overrides });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Failed to fetch availability profile' });
  }
});

/**
 * POST /api/availability/profile
 * Create or update availability profile
 */
router.post('/profile', requireAuth, (req, res) => {
  try {
    const { ownerType, ownerId, timezone } = req.body;

    if (!ownerType || !ownerId) {
      return res.status(400).json({ message: 'ownerType and ownerId are required' });
    }

    if (!['USER', 'VENUE'].includes(ownerType)) {
      return res.status(400).json({ message: 'ownerType must be USER or VENUE' });
    }

    // Permission check: USER can only create their own, VENUE requires host permission
    if (ownerType === 'USER' && ownerId !== req.userId) {
      return res.status(403).json({ message: 'You can only manage your own availability' });
    }

    if (ownerType === 'VENUE') {
      const host = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(ownerId, req.userId);
      if (!host) {
        return res.status(403).json({ message: 'You must be a venue host to manage venue availability' });
      }
    }

    const profile = getOrCreateProfile(ownerType, ownerId);
    if (timezone) {
      db.prepare('UPDATE availability_profiles SET timezone = ?, updatedAt = datetime("now") WHERE id = ?').run(
        timezone,
        profile.id
      );
      profile.timezone = timezone;
    }

    res.json({ profile });
  } catch (err) {
    console.error('Create profile error:', err);
    res.status(500).json({ message: 'Failed to create availability profile' });
  }
});

// ============================================================================
// SLOT ENDPOINTS
// ============================================================================

/**
 * POST /api/availability/slot
 * Create availability slot (recurring or date-specific)
 */
router.post('/slot', requireAuth, (req, res) => {
  try {
    const { ownerType, ownerId, date, dayOfWeek, period, startTime, endTime, status } = req.body;

    if (!ownerType || !ownerId || !period || !startTime || !endTime) {
      return res.status(400).json({
        message: 'ownerType, ownerId, period, startTime, and endTime are required',
      });
    }

    if (!['USER', 'VENUE'].includes(ownerType)) {
      return res.status(400).json({ message: 'ownerType must be USER or VENUE' });
    }

    if (!date && dayOfWeek === null && dayOfWeek === undefined) {
      return res.status(400).json({ message: 'Either date (specific) or dayOfWeek (recurring) is required' });
    }

    if (date && dayOfWeek !== null && dayOfWeek !== undefined) {
      return res.status(400).json({ message: 'Cannot specify both date and dayOfWeek' });
    }

    // Permission check
    if (ownerType === 'USER' && ownerId !== req.userId) {
      return res.status(403).json({ message: 'You can only manage your own availability' });
    }

    if (ownerType === 'VENUE') {
      const host = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(ownerId, req.userId);
      if (!host) {
        return res.status(403).json({ message: 'You must be a venue host' });
      }
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ message: 'Time must be in HH:MM format' });
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      return res.status(400).json({ message: 'startTime must be before endTime' });
    }

    // Check for overlapping slots
    const profile = getOrCreateProfile(ownerType, ownerId);
    let existingSlots;
    if (date) {
      existingSlots = db
        .prepare('SELECT * FROM availability_slots WHERE profileId = ? AND date = ?')
        .all(profile.id, date);
    } else {
      existingSlots = db
        .prepare('SELECT * FROM availability_slots WHERE profileId = ? AND dayOfWeek = ?')
        .all(profile.id, dayOfWeek);
    }

    for (const slot of existingSlots) {
      if (timeRangesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        return res.status(409).json({
          message: 'Overlapping slot exists',
          conflict: slot,
        });
      }
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare(
      `INSERT INTO availability_slots 
       (id, profileId, date, dayOfWeek, period, startTime, endTime, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      profile.id,
      date || null,
      dayOfWeek !== null && dayOfWeek !== undefined ? dayOfWeek : null,
      period,
      startTime,
      endTime,
      status || 'AVAILABLE'
    );

    const slot = db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(id);
    res.status(201).json({ slot });
  } catch (err) {
    console.error('Create slot error:', err);
    res.status(500).json({ message: 'Failed to create availability slot' });
  }
});

/**
 * DELETE /api/availability/slot/:id
 * Delete availability slot
 */
router.delete('/slot/:id', requireAuth, (req, res) => {
  try {
    const slot = db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    const profile = db.prepare('SELECT * FROM availability_profiles WHERE id = ?').get(slot.profileId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Permission check
    if (profile.ownerType === 'USER' && profile.ownerId !== req.userId) {
      return res.status(403).json({ message: 'You can only delete your own slots' });
    }

    if (profile.ownerType === 'VENUE') {
      const host = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(profile.ownerId, req.userId);
      if (!host) {
        return res.status(403).json({ message: 'You must be a venue host' });
      }
    }

    db.prepare('DELETE FROM availability_slots WHERE id = ?').run(req.params.id);
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    console.error('Delete slot error:', err);
    res.status(500).json({ message: 'Failed to delete slot' });
  }
});

// ============================================================================
// OVERRIDE ENDPOINTS
// ============================================================================

/**
 * POST /api/availability/override
 * Create availability override (blocked/booked time)
 */
router.post('/override', requireAuth, (req, res) => {
  try {
    const { ownerType, ownerId, date, startTime, endTime, status, notes } = req.body;

    if (!ownerType || !ownerId || !date || !startTime || !endTime || !status) {
      return res.status(400).json({
        message: 'ownerType, ownerId, date, startTime, endTime, and status are required',
      });
    }

    if (!['USER', 'VENUE'].includes(ownerType)) {
      return res.status(400).json({ message: 'ownerType must be USER or VENUE' });
    }

    if (!['BLOCKED', 'BOOKED'].includes(status)) {
      return res.status(400).json({ message: 'status must be BLOCKED or BOOKED' });
    }

    // Permission check
    if (ownerType === 'USER' && ownerId !== req.userId) {
      return res.status(403).json({ message: 'You can only manage your own availability' });
    }

    if (ownerType === 'VENUE') {
      const host = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(ownerId, req.userId);
      if (!host) {
        return res.status(403).json({ message: 'You must be a venue host' });
      }
    }

    const profile = getOrCreateProfile(ownerType, ownerId);
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    db.prepare(
      `INSERT INTO availability_overrides 
       (id, profileId, date, startTime, endTime, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, profile.id, date, startTime, endTime, status, notes || null);

    const override = db.prepare('SELECT * FROM availability_overrides WHERE id = ?').get(id);
    res.status(201).json({ override });
  } catch (err) {
    console.error('Create override error:', err);
    res.status(500).json({ message: 'Failed to create override' });
  }
});

/**
 * DELETE /api/availability/override/:id
 * Delete availability override
 */
router.delete('/override/:id', requireAuth, (req, res) => {
  try {
    const override = db.prepare('SELECT * FROM availability_overrides WHERE id = ?').get(req.params.id);
    if (!override) {
      return res.status(404).json({ message: 'Override not found' });
    }

    const profile = db.prepare('SELECT * FROM availability_profiles WHERE id = ?').get(override.profileId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Permission check
    if (profile.ownerType === 'USER' && profile.ownerId !== req.userId) {
      return res.status(403).json({ message: 'You can only delete your own overrides' });
    }

    if (profile.ownerType === 'VENUE') {
      const host = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(profile.ownerId, req.userId);
      if (!host) {
        return res.status(403).json({ message: 'You must be a venue host' });
      }
    }

    db.prepare('DELETE FROM availability_overrides WHERE id = ?').run(req.params.id);
    res.json({ message: 'Override deleted' });
  } catch (err) {
    console.error('Delete override error:', err);
    res.status(500).json({ message: 'Failed to delete override' });
  }
});

// ============================================================================
// VENUE AVAILABILITY (CONFLICT-AWARE)
// ============================================================================

/**
 * GET /api/venues/:id/availability
 * Get venue availability with conflict detection
 */
router.get('/venues/:id/availability', (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime } = req.query;

    const profile = db
      .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
      .get('VENUE', id);

    if (!profile) {
      return res.json({ available: false, slots: [], overrides: [], conflicts: [] });
    }

    const slots = db
      .prepare('SELECT * FROM availability_slots WHERE profileId = ? ORDER BY dayOfWeek, startTime')
      .all(profile.id);

    const overrides = db
      .prepare('SELECT * FROM availability_overrides WHERE profileId = ? ORDER BY date, startTime')
      .all(profile.id);

    // If checking specific time, detect conflicts
    let conflicts = [];
    if (date && startTime && endTime) {
      // Check for BLOCKED or BOOKED overrides
      const conflictingOverrides = overrides.filter(
        (o) => o.date === date && timeRangesOverlap(startTime, endTime, o.startTime, o.endTime)
      );

      // Check for bookings (if you have a bookings table linked to events/places)
      // This is a placeholder - adjust based on your schema
      const bookings = db
        .prepare(
          `SELECT e.* FROM events e 
           JOIN places p ON e.placeId = p.id 
           WHERE p.id = ? AND date(e.startAt) = ?`
        )
        .all(id, date);

      conflicts = [
        ...conflictingOverrides.map((o) => ({ type: 'override', ...o })),
        ...bookings.map((b) => ({ type: 'booking', eventId: b.id, title: b.title })),
      ];
    }

    res.json({
      profile,
      slots,
      overrides,
      conflicts,
      available: conflicts.length === 0,
    });
  } catch (err) {
    console.error('Get venue availability error:', err);
    res.status(500).json({ message: 'Failed to fetch venue availability' });
  }
});

/**
 * POST /api/venues/:id/check-availability
 * Check if venue is available for specific date/time
 */
router.post('/venues/:id/check-availability', (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'date, startTime, and endTime are required' });
    }

    const profile = db
      .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
      .get('VENUE', id);

    if (!profile) {
      return res.json({ available: false, conflicts: [] });
    }

    // Check overrides
    const conflictingOverrides = db
      .prepare(
        `SELECT * FROM availability_overrides 
         WHERE profileId = ? AND date = ? 
         AND ((startTime < ? AND endTime > ?) OR (startTime < ? AND endTime > ?))`
      )
      .all(profile.id, date, endTime, startTime, startTime, endTime);

    // Check bookings
    const bookings = db
      .prepare(
        `SELECT e.* FROM events e 
         JOIN places p ON e.placeId = p.id 
         WHERE p.id = ? AND date(e.startAt) = ? 
         AND time(e.startAt) < ? AND time(e.endAt) > ?`
      )
      .all(id, date, endTime, startTime);

    const conflicts = [
      ...conflictingOverrides.map((o) => ({ type: 'override', ...o })),
      ...bookings.map((b) => ({ type: 'booking', eventId: b.id, title: b.title })),
    ];

    // Check if there's a matching slot
    const dayOfWeek = new Date(date).getDay();
    const matchingSlots = db
      .prepare(
        `SELECT * FROM availability_slots 
         WHERE profileId = ? 
         AND (date = ? OR dayOfWeek = ?) 
         AND status = 'AVAILABLE' 
         AND startTime <= ? AND endTime >= ?`
      )
      .all(profile.id, date, dayOfWeek, startTime, endTime);

    const available = matchingSlots.length > 0 && conflicts.length === 0;

    res.json({
      available,
      conflicts,
      matchingSlots,
    });
  } catch (err) {
    console.error('Check availability error:', err);
    res.status(500).json({ message: 'Failed to check availability' });
  }
});

// ============================================================================
// COMMUNITY HEATMAP
// ============================================================================

/**
 * GET /api/communities/:id/availability-heatmap
 * Aggregate USER availability for community members
 */
router.get('/communities/:id/availability-heatmap', (req, res) => {
  try {
    const { id } = req.params;
    const { includeVenues } = req.query;

    // Get community members (assuming you have a community_members table)
    // Adjust based on your schema
    const members = db
      .prepare(
        `SELECT DISTINCT u.id, u.fullName, u.email 
         FROM users u 
         JOIN community_members cm ON u.id = cm.userId 
         WHERE cm.communityId = ?`
      )
      .all(id);

    if (!members || members.length === 0) {
      return res.json({ heatmap: [], totalMembers: 0 });
    }

    // Aggregate availability by dayOfWeek + period
    const heatmap = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = ['MORNING', 'AFTERNOON', 'EVENING'];

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      for (const period of periods) {
        const availableUsers = [];
        let availableCount = 0;

        for (const member of members) {
          const profile = db
            .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
            .get('USER', member.id);

          if (profile) {
            const slots = db
              .prepare(
                `SELECT * FROM availability_slots 
                 WHERE profileId = ? AND dayOfWeek = ? AND period = ? AND status = 'AVAILABLE'`
              )
              .all(profile.id, dayOfWeek, period);

            if (slots.length > 0) {
              availableUsers.push({
                id: member.id,
                fullName: member.fullName,
                email: member.email,
              });
              availableCount++;
            }
          }
        }

        const percentage = members.length > 0 ? Math.round((availableCount / members.length) * 100) : 0;

        heatmap.push({
          dayOfWeek,
          dayName: dayNames[dayOfWeek],
          period,
          availableCount,
          totalMembers: members.length,
          percentage,
          availableUsers: includeVenues === 'true' ? availableUsers : undefined,
        });
      }
    }

    // Include venue availability if requested
    let venues = [];
    if (includeVenues === 'true') {
      const communityVenues = db
        .prepare('SELECT * FROM places WHERE communityId = ?')
        .all(id);

      venues = communityVenues.map((venue) => {
        const profile = db
          .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
          .get('VENUE', venue.id);
        return {
          id: venue.id,
          title: venue.title,
          hasAvailability: !!profile,
        };
      });
    }

    res.json({
      heatmap,
      totalMembers: members.length,
      venues: includeVenues === 'true' ? venues : undefined,
    });
  } catch (err) {
    console.error('Get heatmap error:', err);
    res.status(500).json({ message: 'Failed to fetch availability heatmap' });
  }
});

export default router;
