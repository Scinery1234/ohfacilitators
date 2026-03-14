/**
 * Centralized validation utilities for event lifecycle and business rules
 */

/**
 * Valid event status values
 */
export const EVENT_STATUS = {
  PROPOSED: 'proposed',
  VENUE_APPROVED: 'venue_approved',
  PUBLISHED: 'published',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * Valid state transitions
 * Format: { fromStatus: [allowed toStatuses] }
 */
const ALLOWED_TRANSITIONS = {
  [EVENT_STATUS.PROPOSED]: [EVENT_STATUS.VENUE_APPROVED, EVENT_STATUS.CANCELLED],
  [EVENT_STATUS.VENUE_APPROVED]: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.CANCELLED],
  [EVENT_STATUS.PUBLISHED]: [EVENT_STATUS.COMPLETED, EVENT_STATUS.CANCELLED],
  [EVENT_STATUS.COMPLETED]: [], // Terminal state
  [EVENT_STATUS.CANCELLED]: [], // Terminal state
};

/**
 * Validate event state transition
 * @param {string} oldStatus - Current status
 * @param {string} newStatus - Desired status
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateEventTransition(oldStatus, newStatus) {
  if (!oldStatus || !newStatus) {
    return { valid: false, error: 'Status values are required' };
  }

  if (oldStatus === newStatus) {
    return { valid: true }; // No-op transition is valid
  }

  const allowed = ALLOWED_TRANSITIONS[oldStatus];
  if (!allowed) {
    return { valid: false, error: `Invalid current status: ${oldStatus}` };
  }

  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${oldStatus} to ${newStatus}. Allowed: ${allowed.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate time range
 * @param {string} startTime - ISO datetime string
 * @param {string} endTime - ISO datetime string (optional)
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateTimeRange(startTime, endTime) {
  if (!startTime) {
    return { valid: false, error: 'Start time is required' };
  }

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid start time format' };
  }

  if (start < new Date()) {
    return { valid: false, error: 'Start time must be in the future' };
  }

  if (endTime) {
    const end = new Date(endTime);
    if (isNaN(end.getTime())) {
      return { valid: false, error: 'Invalid end time format' };
    }

    if (end <= start) {
      return { valid: false, error: 'End time must be after start time' };
    }
  }

  return { valid: true };
}

/**
 * Validate event creation data
 * @param {object} data - Event data
 * @param {string} userId - Authenticated user ID
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateEventCreation(data, userId) {
  if (!userId) {
    return { valid: false, error: 'User authentication required' };
  }

  if (!data.title || data.title.trim().length < 3) {
    return { valid: false, error: 'Event title must be at least 3 characters' };
  }

  if (!data.placeId) {
    return { valid: false, error: 'Place ID is required' };
  }

  if (!data.startAt) {
    return { valid: false, error: 'Start time is required' };
  }

  const timeValidation = validateTimeRange(data.startAt, data.endAt);
  if (!timeValidation.valid) {
    return timeValidation;
  }

  if (data.capacity !== undefined && data.capacity !== null) {
    if (typeof data.capacity !== 'number' || data.capacity < 1) {
      return { valid: false, error: 'Capacity must be a positive number' };
    }
  }

  return { valid: true };
}
