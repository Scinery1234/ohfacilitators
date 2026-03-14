/**
 * Permission middleware for place hosts, event creators, etc.
 */

import { db } from '../db.js';
import { EVENT_STATUS } from '../utils/validation.js';

/**
 * Require user to be a host (owner or manager) of the specified place
 * Sets req.placeHostRole on success
 */
export function requirePlaceHost(req, res, next) {
  const placeId = req.params.placeId || req.body.placeId || req.query.placeId;
  const userId = req.userId;

  if (!placeId) {
    return res.status(400).json({ message: 'Place ID is required' });
  }

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check place_hosts table
  const host = db
    .prepare('SELECT role FROM place_hosts WHERE placeId = ? AND userId = ?')
    .get(placeId, userId);

  if (!host) {
    return res.status(403).json({ message: 'You must be a place host (owner or manager) to perform this action' });
  }

  req.placeHostRole = host.role;
  next();
}

/**
 * Require user to be the creator of the specified event
 * Sets req.event on success
 */
export function requireEventCreator(req, res, next) {
  const eventId = req.params.eventId || req.params.id || req.body.eventId;
  const userId = req.userId;

  if (!eventId) {
    return res.status(400).json({ message: 'Event ID is required' });
  }

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const event = db.prepare('SELECT id, proposed_by, status FROM events WHERE id = ?').get(eventId);

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (event.proposed_by !== userId) {
    return res.status(403).json({ message: 'Only the event creator can perform this action' });
  }

  req.event = event;
  next();
}

/**
 * Require event to be published
 * Sets req.event on success
 */
export function requirePublishedEvent(req, res, next) {
  const eventId = req.params.eventId || req.params.id || req.body.eventId || req.body.listingId;

  if (!eventId) {
    return res.status(400).json({ message: 'Event ID is required' });
  }

  const event = db
    .prepare('SELECT id, status, capacity FROM events WHERE id = ?')
    .get(eventId);

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (event.status !== EVENT_STATUS.PUBLISHED) {
    return res.status(403).json({
      message: `Event is not published. Current status: ${event.status}. Only published events can be booked.`,
    });
  }

  req.event = event;
  next();
}
