/**
 * Bookings routes
 * Uses bookingService for business logic
 */

import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePublishedEvent } from '../middleware/permissions.js';
import * as bookingService from '../services/bookingService.js';

const router = Router();

function bookingToResponse(row, event = null) {
  const booking = {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (event) {
    booking.event = {
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      capacity: event.capacity,
    };
  }

  return booking;
}

// GET /bookings - List bookings with filters
router.get('/', requireAuth, (req, res) => {
  try {
    const { id, scope = 'mine', eventId } = req.query;
    const userId = req.userId;

    let query = 'SELECT b.* FROM bookings b';
    const params = [];

    if (id) {
      query += ' WHERE b.id = ?';
      params.push(id);
    } else if (scope === 'mine') {
      query += ' WHERE b.userId = ?';
      params.push(userId);
    } else if (scope === 'host') {
      // Bookings for events at places where user is host
      query += `
        INNER JOIN events e ON b.eventId = e.id
        INNER JOIN place_hosts ph ON e.placeId = ph.placeId
        WHERE ph.userId = ?
      `;
      params.push(userId);
    }

    if (eventId) {
      query += scope === 'mine' || scope === 'host' ? ' AND b.eventId = ?' : ' WHERE b.eventId = ?';
      params.push(eventId);
    }

    query += ' ORDER BY b.createdAt DESC';

    const bookings = db.prepare(query).all(...params);

    // Enrich with event details
    const enriched = bookings.map((booking) => {
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(booking.eventId);
      return bookingToResponse(booking, event);
    });

    res.json({ bookings: enriched });
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// GET /bookings/:id - Get booking detail
router.get('/:id', requireAuth, (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user owns booking or is event host
    const isOwner = booking.userId === req.userId;
    if (!isOwner) {
      const event = db.prepare('SELECT placeId FROM events WHERE id = ?').get(booking.eventId);
      if (event) {
        const isHost = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(event.placeId, req.userId);
        if (!isHost) {
          return res.status(403).json({ message: 'You do not have permission to view this booking' });
        }
      }
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(booking.eventId);
    res.json({ booking: bookingToResponse(booking, event) });
  } catch (err) {
    console.error('Get booking error:', err);
    res.status(500).json({ message: 'Failed to fetch booking' });
  }
});

// POST /bookings - Create booking (atomic operation)
router.post('/', requireAuth, (req, res) => {
  try {
    const eventId = req.body.eventId || req.body.listingId;
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Verify event is published (middleware-style check)
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.status !== 'published') {
      return res.status(403).json({
        message: `Event is not published. Current status: ${event.status}. Only published events can be booked.`,
      });
    }

    const result = bookingService.createBooking({ ...req.body, eventId }, req.userId);
    if (!result.success) {
      const status = result.waitlist ? 409 : 400;
      return res.status(status).json({ message: result.error, waitlist: result.waitlist });
    }
    res.status(201).json({ booking: result.booking });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ message: 'Failed to create booking' });
  }
});

// PATCH /bookings/:id - Update booking
router.patch('/:id', requireAuth, (req, res) => {
  try {
    const result = bookingService.updateBooking(req.params.id, req.body, req.userId);
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    res.json({ booking: result.booking });
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ message: 'Failed to update booking' });
  }
});

// DELETE /bookings/:id - Cancel booking
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only owner can cancel
    if (booking.userId !== req.userId) {
      return res.status(403).json({ message: 'Only the booking owner can cancel this booking' });
    }

    db.prepare('UPDATE bookings SET status = ?, updatedAt = ? WHERE id = ?').run(
      'cancelled',
      new Date().toISOString(),
      req.params.id
    );

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

export default router;
