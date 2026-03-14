/**
 * Availability routes
 * CRUD endpoints for place, facilitator, and member availability
 */

import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// GET /availability/places - List place availability
router.get('/places', (req, res) => {
  try {
    const { placeId, date } = req.query;
    let query = 'SELECT * FROM place_availability WHERE 1=1';
    const params = [];

    if (placeId) {
      query += ' AND placeId = ?';
      params.push(placeId);
    }

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY date, startTime';

    const availability = db.prepare(query).all(...params);
    res.json({ availability });
  } catch (err) {
    console.error('Get place availability error:', err);
    res.status(500).json({ message: 'Failed to fetch place availability' });
  }
});

// POST /availability/places - Create place availability
router.post('/places', requireAuth, (req, res) => {
  try {
    const { placeId, date, startTime, endTime } = req.body;

    if (!placeId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Place ID, date, start time, and end time are required' });
    }

    // Verify user is place host
    const host = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(placeId, req.userId);
    if (!host) {
      return res.status(403).json({ message: 'You must be a place host to set availability' });
    }

    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO place_availability (id, placeId, date, startTime, endTime) VALUES (?, ?, ?, ?, ?)').run(
      id,
      placeId,
      date,
      startTime,
      endTime
    );

    const availability = db.prepare('SELECT * FROM place_availability WHERE id = ?').get(id);
    res.status(201).json({ availability });
  } catch (err) {
    console.error('Create place availability error:', err);
    res.status(500).json({ message: 'Failed to create place availability' });
  }
});

// DELETE /availability/places/:id - Delete place availability
router.delete('/places/:id', requireAuth, (req, res) => {
  try {
    const availability = db.prepare('SELECT placeId FROM place_availability WHERE id = ?').get(req.params.id);
    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    // Verify user is place host
    const host = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(availability.placeId, req.userId);
    if (!host) {
      return res.status(403).json({ message: 'You must be a place host to delete availability' });
    }

    db.prepare('DELETE FROM place_availability WHERE id = ?').run(req.params.id);
    res.json({ message: 'Availability deleted' });
  } catch (err) {
    console.error('Delete place availability error:', err);
    res.status(500).json({ message: 'Failed to delete place availability' });
  }
});

// GET /availability/facilitators - List facilitator availability
router.get('/facilitators', (req, res) => {
  try {
    const { userId, date } = req.query;
    let query = 'SELECT * FROM facilitator_availability WHERE 1=1';
    const params = [];

    if (userId) {
      query += ' AND userId = ?';
      params.push(userId);
    }

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY date, startTime';

    const availability = db.prepare(query).all(...params);
    res.json({ availability });
  } catch (err) {
    console.error('Get facilitator availability error:', err);
    res.status(500).json({ message: 'Failed to fetch facilitator availability' });
  }
});

// POST /availability/facilitators - Create facilitator availability
router.post('/facilitators', requireAuth, (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;
    const userId = req.userId;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Date, start time, and end time are required' });
    }

    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO facilitator_availability (id, userId, date, startTime, endTime) VALUES (?, ?, ?, ?, ?)').run(
      id,
      userId,
      date,
      startTime,
      endTime
    );

    const availability = db.prepare('SELECT * FROM facilitator_availability WHERE id = ?').get(id);
    res.status(201).json({ availability });
  } catch (err) {
    console.error('Create facilitator availability error:', err);
    res.status(500).json({ message: 'Failed to create facilitator availability' });
  }
});

// DELETE /availability/facilitators/:id - Delete facilitator availability
router.delete('/facilitators/:id', requireAuth, (req, res) => {
  try {
    const availability = db.prepare('SELECT userId FROM facilitator_availability WHERE id = ?').get(req.params.id);
    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    if (availability.userId !== req.userId) {
      return res.status(403).json({ message: 'You can only delete your own availability' });
    }

    db.prepare('DELETE FROM facilitator_availability WHERE id = ?').run(req.params.id);
    res.json({ message: 'Availability deleted' });
  } catch (err) {
    console.error('Delete facilitator availability error:', err);
    res.status(500).json({ message: 'Failed to delete facilitator availability' });
  }
});

// GET /availability/members - List member availability
router.get('/members', (req, res) => {
  try {
    const { userId, communityId, date } = req.query;
    let query = 'SELECT * FROM member_availability WHERE 1=1';
    const params = [];

    if (userId) {
      query += ' AND userId = ?';
      params.push(userId);
    }

    if (communityId) {
      query += ' AND communityId = ?';
      params.push(communityId);
    }

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY date';

    const availability = db.prepare(query).all(...params);
    res.json({ availability });
  } catch (err) {
    console.error('Get member availability error:', err);
    res.status(500).json({ message: 'Failed to fetch member availability' });
  }
});

// POST /availability/members - Create member availability
router.post('/members', requireAuth, (req, res) => {
  try {
    const { date, communityId } = req.body;
    const userId = req.userId;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO member_availability (id, userId, communityId, date) VALUES (?, ?, ?, ?)').run(
      id,
      userId,
      communityId || null,
      date
    );

    const availability = db.prepare('SELECT * FROM member_availability WHERE id = ?').get(id);
    res.status(201).json({ availability });
  } catch (err) {
    console.error('Create member availability error:', err);
    res.status(500).json({ message: 'Failed to create member availability' });
  }
});

// DELETE /availability/members/:id - Delete member availability
router.delete('/members/:id', requireAuth, (req, res) => {
  try {
    const availability = db.prepare('SELECT userId FROM member_availability WHERE id = ?').get(req.params.id);
    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    if (availability.userId !== req.userId) {
      return res.status(403).json({ message: 'You can only delete your own availability' });
    }

    db.prepare('DELETE FROM member_availability WHERE id = ?').run(req.params.id);
    res.json({ message: 'Availability deleted' });
  } catch (err) {
    console.error('Delete member availability error:', err);
    res.status(500).json({ message: 'Failed to delete member availability' });
  }
});

export default router;
