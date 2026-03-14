/**
 * Event service - centralized business logic for events
 * Routes should call these functions, not contain business logic
 */

import { db } from '../db.js';
import { validateEventCreation, validateEventTransition, EVENT_STATUS } from '../utils/validation.js';
import { checkEventConflict } from '../utils/conflicts.js';
import crypto from 'crypto';

/**
 * Create a new event
 * @param {object} data - Event data
 * @param {string} userId - Authenticated user ID
 * @returns {object} { success: boolean, event?: object, error?: string }
 */
export function createEvent(data, userId) {
  // Validate creation
  const validation = validateEventCreation(data, userId);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check for conflicts (optional at creation, but recommended)
  const conflictCheck = checkEventConflict({
    placeId: data.placeId,
    startAt: data.startAt,
    endAt: data.endAt,
  });

  if (conflictCheck.hasConflict) {
    return {
      success: false,
      error: `Time conflict with existing event: ${conflictCheck.conflictingEvent.title}`,
    };
  }

  // Create event with default status = proposed
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  try {
    db.prepare(
      `INSERT INTO events (
        id, title, description, imageUrl, placeId, communityId,
        startAt, endAt, capacity,
        status, proposed_by, createdBy,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.title.trim(),
      data.description || null,
      data.imageUrl || null,
      data.placeId,
      data.communityId || null,
      data.startAt,
      data.endAt || null,
      data.capacity || null,
      EVENT_STATUS.PROPOSED, // Default status
      userId, // proposed_by
      userId, // createdBy
      now,
      now
    );

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    return { success: true, event: eventToResponse(event) };
  } catch (err) {
    console.error('Create event error:', err);
    return { success: false, error: 'Failed to create event' };
  }
}

/**
 * Approve an event (venue host only)
 * Must be atomic: check conflict + update status in transaction
 * @param {string} eventId - Event ID
 * @param {string} userId - Authenticated user ID (must be place host)
 * @returns {object} { success: boolean, event?: object, error?: string }
 */
export function approveEvent(eventId, userId) {
  return db.transaction(() => {
    // Lock event row
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Validate current status
    if (event.status !== EVENT_STATUS.PROPOSED) {
      return {
        success: false,
        error: `Event cannot be approved. Current status: ${event.status}. Only proposed events can be approved.`,
      };
    }

    // Verify user is place host
    const host = db.prepare('SELECT role FROM place_hosts WHERE placeId = ? AND userId = ?').get(event.placeId, userId);
    if (!host) {
      return { success: false, error: 'You must be a place host (owner or manager) to approve events' };
    }

    // Check for conflicts
    const conflictCheck = checkEventConflict({
      placeId: event.placeId,
      startAt: event.startAt,
      endAt: event.endAt,
      excludeEventId: eventId,
    });

    if (conflictCheck.hasConflict) {
      return {
        success: false,
        error: `Cannot approve: time conflict with existing event "${conflictCheck.conflictingEvent.title}"`,
      };
    }

    // Update status
    const now = new Date().toISOString();
    db.prepare('UPDATE events SET status = ?, venue_approved_at = ?, updatedAt = ? WHERE id = ?').run(
      EVENT_STATUS.VENUE_APPROVED,
      now,
      now,
      eventId
    );

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    return { success: true, event: eventToResponse(updated) };
  })();
}

/**
 * Publish an event (event creator only)
 * @param {string} eventId - Event ID
 * @param {string} userId - Authenticated user ID (must be event creator)
 * @returns {object} { success: boolean, event?: object, error?: string }
 */
export function publishEvent(eventId, userId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

  if (!event) {
    return { success: false, error: 'Event not found' };
  }

  // Validate transition
  const transition = validateEventTransition(event.status, EVENT_STATUS.PUBLISHED);
  if (!transition.valid) {
    return { success: false, error: transition.error };
  }

  // Verify user is event creator
  if (event.proposed_by !== userId) {
    return { success: false, error: 'Only the event creator can publish this event' };
  }

  // Update status
  const now = new Date().toISOString();
  db.prepare('UPDATE events SET status = ?, updatedAt = ? WHERE id = ?').run(
    EVENT_STATUS.PUBLISHED,
    now,
    eventId
  );

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  return { success: true, event: eventToResponse(updated) };
}

/**
 * Cancel an event
 * @param {string} eventId - Event ID
 * @param {string} userId - Authenticated user ID
 * @returns {object} { success: boolean, event?: object, error?: string }
 */
export function cancelEvent(eventId, userId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

  if (!event) {
    return { success: false, error: 'Event not found' };
  }

  // Only creator or place host can cancel
  const isCreator = event.proposed_by === userId;
  const isHost = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(event.placeId, userId);

  if (!isCreator && !isHost) {
    return { success: false, error: 'Only the event creator or place host can cancel this event' };
  }

  // Validate transition
  const transition = validateEventTransition(event.status, EVENT_STATUS.CANCELLED);
  if (!transition.valid) {
    return { success: false, error: transition.error };
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE events SET status = ?, updatedAt = ? WHERE id = ?').run(
    EVENT_STATUS.CANCELLED,
    now,
    eventId
  );

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  return { success: true, event: eventToResponse(updated) };
}

/**
 * Convert database row to API response format
 */
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
