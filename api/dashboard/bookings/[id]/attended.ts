/**
 * PATCH /api/dashboard/bookings/:id/attended
 *
 * Host-facing — JWT required.
 * Marks a booking as attended (true) or not attended (false).
 *
 * Request body: { attended: boolean }
 *
 * Only the host who owns the related event (or an admin) may call this.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../../../server-lib/db.js';
import { requireAuth } from '../../../../server-lib/requireAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initDb();

  const user = await requireAuth(req, res);
  if (!user) return;

  const bookingId = typeof req.query.id === 'string' ? req.query.id : null;
  if (!bookingId) {
    return res.status(400).json({ message: 'Booking ID required' });
  }

  const { attended } = req.body ?? {};
  if (typeof attended !== 'boolean') {
    return res.status(400).json({ message: 'attended must be a boolean' });
  }

  // Fetch booking + host info to verify ownership
  const rows = await sql`
    SELECT
      b.id,
      b.status,
      b."hostId",
      e.host_id AS event_host_id
    FROM bookings b
    LEFT JOIN events e ON e.id = b."listingId" AND b."listingType" = 'event'
    WHERE b.id = ${bookingId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  const booking = rows[0] as {
    id: string;
    status: string;
    hostId: string | null;
    event_host_id: string | null;
  };

  const canEdit =
    user.role === 'admin' ||
    booking.hostId === user.id ||
    booking.event_host_id === user.id;

  if (!canEdit) {
    return res.status(403).json({ message: 'Not authorized to update this booking' });
  }

  if (booking.status !== 'confirmed') {
    return res.status(409).json({
      message: `Attendance can only be marked for confirmed bookings (current: ${booking.status})`,
    });
  }

  try {
    const updated = await sql`
      UPDATE bookings
      SET attended = ${attended}, "updatedAt" = NOW()
      WHERE id = ${bookingId}
      RETURNING id, status, attended, "updatedAt"
    `;

    return res.json({ booking: updated[0] });
  } catch (err) {
    console.error('PATCH /api/dashboard/bookings/:id/attended error:', err);
    return res.status(500).json({ message: 'Failed to update attendance' });
  }
}
