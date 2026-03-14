/**
 * Booking service - centralized business logic for bookings
 * Atomic operations with transactions
 */

import { db } from '../db.js';
import { EVENT_STATUS } from '../utils/validation.js';
import crypto from 'crypto';

/**
 * Create a booking (atomic operation)
 * Must check capacity and prevent double booking in transaction
 * @param {object} data - Booking data
 * @param {string} userId - Authenticated user ID
 * @returns {object} { success: boolean, booking?: object, error?: string }
 */
export function createBooking(data, userId) {
  const eventId = data.eventId || data.listingId;
  const listingType = data.listingType;

  if (!eventId) {
    return { success: false, error: 'Event ID is required' };
  }

  if (listingType && listingType !== 'event') {
    // For now, only events can be booked
    return { success: false, error: 'Only events can be booked' };
  }

  return db.transaction(() => {
    // Lock event row FOR UPDATE
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Enforce: only published events can be booked
    if (event.status !== EVENT_STATUS.PUBLISHED) {
      return {
        success: false,
        error: `Event is not published. Current status: ${event.status}. Only published events can be booked.`,
      };
    }

    // Check for existing booking (prevent double booking)
    const existing = db
      .prepare('SELECT id FROM bookings WHERE eventId = ? AND userId = ? AND status != ?')
      .get(eventId, userId, 'cancelled');

    if (existing) {
      return { success: false, error: 'You already have a booking for this event' };
    }

    // Check capacity
    if (event.capacity !== null && event.capacity !== undefined) {
      const currentBookings = db
        .prepare('SELECT COUNT(*) as count FROM bookings WHERE eventId = ? AND status != ?')
        .get(eventId, 'cancelled');

      if (currentBookings.count >= event.capacity) {
        return {
          success: false,
          error: 'Event is at full capacity',
          waitlist: true,
        };
      }
    }

    // Create booking
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO bookings (
        id, eventId, userId, status, notes,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      eventId,
      userId,
      'pending', // Default status
      data.notes || null,
      now,
      now
    );

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return { success: true, booking: bookingToResponse(booking, event) };
  })();
}

/**
 * Update booking status
 * @param {string} bookingId - Booking ID
 * @param {object} updates - Updates (status, notes, etc.)
 * @param {string} userId - Authenticated user ID (must be booking owner or event host)
 * @returns {object} { success: boolean, booking?: object, error?: string }
 */
export function updateBooking(bookingId, updates, userId) {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  // Verify user owns booking or is event host
  const isOwner = booking.userId === userId;
  if (!isOwner) {
    const event = db.prepare('SELECT placeId FROM events WHERE id = ?').get(booking.eventId);
    if (event) {
      const isHost = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(event.placeId, userId);
      if (!isHost) {
        return { success: false, error: 'You do not have permission to update this booking' };
      }
    } else {
      return { success: false, error: 'You do not have permission to update this booking' };
    }
  }

  const now = new Date().toISOString();
  const allowedFields = ['status', 'notes'];
  const updatesToApply = {};
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      updatesToApply[field] = updates[field];
    }
  });

  if (Object.keys(updatesToApply).length === 0) {
    return { success: false, error: 'No valid fields to update' };
  }

  const setClause = Object.keys(updatesToApply)
    .map((key) => `${key} = ?`)
    .join(', ');
  const values = [...Object.values(updatesToApply), now, bookingId];

  db.prepare(`UPDATE bookings SET ${setClause}, updatedAt = ? WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(updated.eventId);
  return { success: true, booking: bookingToResponse(updated, event) };
}

/**
 * Convert database row to API response format
 */
function bookingToResponse(row, event) {
  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    event: event
      ? {
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          capacity: event.capacity,
        }
      : null,
  };
}
