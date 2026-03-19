/**
 * GET /api/dashboard/sessions/:id/participants
 *
 * Host-facing — JWT required.
 * Returns the participant list for a specific session.
 *
 * Only the host who owns the event (or an admin) may access this.
 * Participant contact details (email, phone) are included for the host.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../../../server-lib/db.js';
import { requireAuth } from '../../../../server-lib/requireAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initDb();

  const user = await requireAuth(req, res);
  if (!user) return;

  const sessionId = typeof req.query.id === 'string' ? req.query.id : null;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID required' });
  }

  // Verify the requestor owns this session
  const eventRows = await sql`
    SELECT id, title, host_id, capacity FROM events WHERE id = ${sessionId}
  `;

  if (eventRows.length === 0) {
    return res.status(404).json({ message: 'Session not found' });
  }

  const event = eventRows[0] as {
    id: string;
    title: string;
    host_id: string | null;
    capacity: number | null;
  };

  const canAccess = user.role === 'admin' || event.host_id === user.id;
  if (!canAccess) {
    return res.status(403).json({ message: 'Not authorized to view participants for this session' });
  }

  try {
    const rows = await sql`
      SELECT
        b.id AS booking_id,
        b.status,
        b.payment_status,
        b.attended,
        b."createdAt" AS booked_at,
        b."startAt",
        u.id AS user_id,
        u."fullName" AS name,
        u.email,
        u.phone,
        u."avatarUrl"
      FROM bookings b
      INNER JOIN users u ON u.id = b."userId"
      WHERE b."listingType" = 'event'
        AND b."listingId" = ${sessionId}
        AND b.status IN ('pending', 'confirmed', 'waitlist')
      ORDER BY b."createdAt" ASC
    `;

    const confirmed = rows.filter((r) => r.status === 'confirmed').length;
    const pending = rows.filter((r) => r.status === 'pending').length;
    const waitlist = rows.filter((r) => r.status === 'waitlist').length;
    const attended = rows.filter((r) => r.attended === true).length;

    return res.json({
      session: {
        id: event.id,
        title: event.title,
        capacity: event.capacity ?? null,
      },
      summary: { confirmed, pending, waitlist, attended },
      participants: rows.map((r) => ({
        bookingId: r.booking_id,
        status: r.status,
        paymentStatus: r.payment_status,
        attended: r.attended ?? null,
        bookedAt: r.booked_at,
        startAt: r.startAt,
        user: {
          id: r.user_id,
          name: r.name,
          email: r.email,
          phone: r.phone ?? null,
          avatarUrl: r.avatarUrl ?? null,
        },
      })),
    });
  } catch (err) {
    console.error('GET /api/dashboard/sessions/:id/participants error:', err);
    return res.status(500).json({ message: 'Failed to fetch participants' });
  }
}
