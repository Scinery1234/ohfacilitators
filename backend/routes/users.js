import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function userToResponse(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role || 'user',
  };
}

// GET /users/me - current user (protected)
router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, email, fullName, role FROM users WHERE id = ?').get(req.userId);
  if (!row) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ user: userToResponse(row) });
});

// GET /user/profile - Get user profile with optional schedule
router.get('/profile', requireAuth, (req, res) => {
  try {
    const { schedule, counts } = req.query;
    const userId = req.userId;

    const user = db.prepare('SELECT id, email, fullName, role FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const response = { user: userToResponse(user) };

    if (schedule === 'true') {
      // Get user's schedule: events they created, facilitate, or attend
      const createdEvents = db
        .prepare(
          `SELECT id, title, startAt, 'event' as type, 'owner' as role, status
           FROM events WHERE createdBy = ? ORDER BY startAt DESC`
        )
        .all(userId);

      // Facilitated events (if facilitator_availability links to events in future)
      // For now, return empty array - can be extended later
      const facilitatedEvents = [];

      const attendingEvents = db
        .prepare(
          `SELECT e.id, e.title, e.startAt, 'event' as type, 'attending' as role, e.status
           FROM events e
           INNER JOIN bookings b ON e.id = b.eventId
           WHERE b.userId = ? AND b.status != 'cancelled'
           ORDER BY e.startAt DESC`
        )
        .all(userId);

      // Combine and deduplicate
      const scheduleMap = new Map();
      [...createdEvents, ...facilitatedEvents, ...attendingEvents].forEach((item) => {
        const key = `${item.type}-${item.id}`;
        if (!scheduleMap.has(key) || item.role === 'owner') {
          scheduleMap.set(key, {
            id: item.id,
            title: item.title,
            startAt: item.startAt,
            type: item.type,
            role: item.role,
            status: item.status,
          });
        }
      });

      response.schedule = Array.from(scheduleMap.values());
    }

    if (counts === 'true') {
      // Get navigation counts
      const eventsCount = db.prepare('SELECT COUNT(*) as count FROM events WHERE createdBy = ?').get(userId).count;
      const placesCount = db.prepare('SELECT COUNT(*) as count FROM places WHERE createdBy = ?').get(userId).count;
      const scheduleCount = db
        .prepare(
          `SELECT COUNT(DISTINCT e.id) as count
           FROM events e
           LEFT JOIN bookings b ON e.id = b.eventId AND b.userId = ?
           WHERE e.createdBy = ? OR b.id IS NOT NULL`
        )
        .get(userId, userId).count;
      // Communities count (if community_members table exists in future)
      // For now, count communities user created
      const communitiesCount = db
        .prepare('SELECT COUNT(*) as count FROM communities WHERE createdBy = ?')
        .get(userId).count || 0;
      const messagesUnread = 0; // TODO: implement when messages table exists

      response.counts = {
        events: eventsCount,
        places: placesCount,
        schedule: scheduleCount,
        communities: communitiesCount,
        messagesUnread,
      };
    }

    res.json(response);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

export default router;
