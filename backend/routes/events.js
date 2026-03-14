/**
 * Events routes
 * Uses eventService for business logic
 */

import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePlaceHost, requireEventCreator, requirePublishedEvent } from '../middleware/permissions.js';
import * as eventService from '../services/eventService.js';
import { EVENT_STATUS } from '../utils/validation.js';

const router = Router();

function eventToResponse(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    placeId: row.placeId,
    communityId: row.communityId,
    startAt: row.startAt,
    endAt: row.endAt,
    capacity: row.capacity,
    status: row.status,
    proposed_by: row.proposed_by,
    venue_approved_at: row.venue_approved_at,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// GET /events - List events with filters
router.get('/', (req, res) => {
  try {
    const { id, mine, placeId, status, limit = 100 } = req.query;

    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (id) {
      query += ' AND id = ?';
      params.push(id);
    }

    if (mine === 'true' && req.userId) {
      query += ' AND createdBy = ?';
      params.push(req.userId);
    }

    if (placeId) {
      query += ' AND placeId = ?';
      params.push(placeId);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY startAt DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const events = db.prepare(query).all(...params);
    res.json({ events: events.map(eventToResponse) });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// GET /events/:id - Get event detail
router.get('/:id', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ event: eventToResponse(event) });
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ message: 'Failed to fetch event' });
  }
});

// POST /events - Create event (defaults to proposed)
router.post('/', requireAuth, (req, res) => {
  try {
    const result = eventService.createEvent(req.body, req.userId);
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    res.status(201).json({ event: result.event });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

// PATCH /events/:id - Update event
router.patch('/:id', requireAuth, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Only creator can update
    if (event.proposed_by !== req.userId) {
      return res.status(403).json({ message: 'Only the event creator can update this event' });
    }

    const allowedFields = ['title', 'description', 'imageUrl', 'startAt', 'endAt', 'capacity'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const setClause = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), new Date().toISOString(), req.params.id];

    db.prepare(`UPDATE events SET ${setClause}, updatedAt = ? WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    res.json({ event: eventToResponse(updated) });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ message: 'Failed to update event' });
  }
});

// DELETE /events/:id - Delete event
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Only creator can delete
    if (event.proposed_by !== req.userId) {
      return res.status(403).json({ message: 'Only the event creator can delete this event' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// POST /events/:id/approve - Approve event (place host only)
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const event = db.prepare('SELECT placeId FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Temporarily set placeId for middleware
    req.params.placeId = event.placeId;
    req.body.placeId = event.placeId;

    // Check permission
    const host = db.prepare('SELECT role FROM place_hosts WHERE placeId = ? AND userId = ?').get(event.placeId, req.userId);
    if (!host) {
      return res.status(403).json({ message: 'You must be a place host (owner or manager) to approve events' });
    }

    const result = eventService.approveEvent(req.params.id, req.userId);
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    res.json({ event: result.event });
  } catch (err) {
    console.error('Approve event error:', err);
    res.status(500).json({ message: 'Failed to approve event' });
  }
});

// POST /events/:id/publish - Publish event (event creator only)
router.post('/:id/publish', requireAuth, (req, res) => {
  try {
    const result = eventService.publishEvent(req.params.id, req.userId);
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    res.json({ event: result.event });
  } catch (err) {
    console.error('Publish event error:', err);
    res.status(500).json({ message: 'Failed to publish event' });
  }
});

// POST /events/:id/cancel - Cancel event
router.post('/:id/cancel', requireAuth, (req, res) => {
  try {
    const result = eventService.cancelEvent(req.params.id, req.userId);
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    res.json({ event: result.event });
  } catch (err) {
    console.error('Cancel event error:', err);
    res.status(500).json({ message: 'Failed to cancel event' });
  }
});

export default router;
