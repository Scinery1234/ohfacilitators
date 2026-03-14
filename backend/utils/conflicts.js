/**
 * Conflict detection utility for events
 * Prevents double booking at the place level
 */

import { db } from '../db.js';
import { EVENT_STATUS } from './validation.js';

/**
 * Check if an event conflicts with existing events
 * @param {object} params
 * @param {string} params.placeId - Place ID
 * @param {string} params.startAt - ISO datetime string
 * @param {string} params.endAt - ISO datetime string (optional)
 * @param {string} [params.excludeEventId] - Event ID to exclude from conflict check
 * @returns {object} { hasConflict: boolean, conflictingEvent?: object }
 */
export function checkEventConflict({ placeId, startAt, endAt, excludeEventId = null }) {
  if (!placeId || !startAt) {
    return { hasConflict: false };
  }

  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;

  // Extract date part for same-day matching
  const dateStr = startAt.split('T')[0];

  // Build query: same place, same date, approved/published status, time overlap
  let query = `
    SELECT id, title, startAt, endAt, status
    FROM events
    WHERE placeId = ?
      AND date(startAt) = date(?)
      AND status IN (?, ?)
  `;
  const params = [placeId, startAt, EVENT_STATUS.VENUE_APPROVED, EVENT_STATUS.PUBLISHED];

  if (excludeEventId) {
    query += ' AND id != ?';
    params.push(excludeEventId);
  }

  const existingEvents = db.prepare(query).all(...params);

  // Check for time overlap
  for (const event of existingEvents) {
    const existingStart = new Date(event.startAt);
    const existingEnd = event.endAt ? new Date(event.endAt) : new Date(existingStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no end

    // Overlap condition: (start < existing.end) AND (end > existing.start)
    // If no end time provided, assume 1 hour duration
    const checkEnd = end || new Date(start.getTime() + 60 * 60 * 1000);

    if (start < existingEnd && checkEnd > existingStart) {
      return {
        hasConflict: true,
        conflictingEvent: {
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          status: event.status,
        },
      };
    }
  }

  return { hasConflict: false };
}
