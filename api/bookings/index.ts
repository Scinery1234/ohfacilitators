import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { verifyToken } from '../../server-lib/auth.js';

async function requireAuth(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const { userId } = verifyToken(token);
    const rows = await sql`SELECT id, role FROM users WHERE id = ${userId}`;
    if (rows.length === 0) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return null;
    }
    return rows[0] as { id: string; role: string };
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();

  const bookingId = typeof req.query.id === 'string' ? req.query.id : null;

  // Handle GET/PATCH/DELETE /api/bookings?id=xxx (single booking)
  if (bookingId) {
    const user = await requireAuth(req, res);
    if (!user) return;

    const rows = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
    if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });

    const booking = rows[0] as { userId: string; hostId: string };
    const canAccess =
      booking.userId === user.id || booking.hostId === user.id || user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({ message: 'Not authorized to access this booking' });
    }

    if (req.method === 'GET') {
      return res.json({ booking: rows[0] });
    }

    if (req.method === 'PATCH') {
      try {
        const { status, startAt, endAt, notes } = req.body || {};

        if (status && !['pending', 'confirmed', 'cancelled', 'waitlist'].includes(status)) {
          return res.status(400).json({ message: "Invalid status. Use 'pending', 'confirmed', or 'cancelled'." });
        }

        const now = new Date().toISOString();

        const updated = await sql`
          UPDATE bookings
          SET
            status = COALESCE(${status || null}, status),
            "startAt" = COALESCE(${startAt || null}, "startAt"),
            "endAt" = COALESCE(${endAt || null}, "endAt"),
            notes = COALESCE(${notes || null}, notes),
            "updatedAt" = ${now}
          WHERE id = ${bookingId}
          RETURNING *
        `;

        return res.json({ booking: updated[0] });
      } catch (err) {
        console.error('Update booking error:', err);
        return res.status(500).json({ message: 'Failed to update booking' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        await sql`DELETE FROM bookings WHERE id = ${bookingId}`;
        return res.status(204).send('');
      } catch (err) {
        console.error('Delete booking error:', err);
        return res.status(500).json({ message: 'Failed to delete booking' });
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Handle POST /api/bookings (create)
  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;

    const body = req.body || {};

    // Manual add attendee (event owner/collaborator only)
    if (body.action === 'add-attendee' && body.eventId && body.userId) {
      const eventId = String(body.eventId);
      const targetUserId = String(body.userId);
      const eventRows = await sql`SELECT id, "createdBy", capacity FROM events WHERE id = ${eventId}`;
      if (eventRows.length === 0) return res.status(404).json({ message: 'Event not found' });
      const ev = eventRows[0] as { id: string; createdBy: string; capacity: number | null };
      const membership = await sql`
        SELECT role FROM object_memberships
        WHERE "objectType" = 'event' AND "objectId" = ${eventId} AND "userId" = ${user.id}
      `;
      const canAdd = user.role === 'admin' || ev.createdBy === user.id || (membership.length > 0 && ((membership[0] as { role: string }).role === 'owner' || (membership[0] as { role: string }).role === 'collaborator'));
      if (!canAdd) return res.status(403).json({ message: 'Not authorized to add attendees' });
      const targetExists = await sql`SELECT id FROM users WHERE id = ${targetUserId}`;
      if (targetExists.length === 0) return res.status(404).json({ message: 'User not found' });
      const existing = await sql`
        SELECT id FROM bookings
        WHERE "userId" = ${targetUserId} AND "listingType" = 'event' AND "listingId" = ${eventId}
        AND status IN ('pending', 'confirmed', 'waitlist')
      `;
      if (existing.length > 0) return res.status(400).json({ message: 'User is already registered' });
      const evDetail = await sql`SELECT "startAt", "endAt" FROM events WHERE id = ${eventId}`;
      const startAt = evDetail[0] ? (evDetail[0] as { startAt: string }).startAt : null;
      const endAt = evDetail[0] ? (evDetail[0] as { endAt: string }).endAt : null;
      const hostId = ev.createdBy;
      const capacity = ev.capacity != null && ev.capacity > 0 ? ev.capacity : null;
      let status = 'confirmed';
      if (capacity) {
        const count = await sql`
          SELECT COUNT(*)::int AS c FROM bookings
          WHERE "listingType" = 'event' AND "listingId" = ${eventId} AND status IN ('pending', 'confirmed')
        `;
        const current = Number((count[0] as { c: number })?.c ?? 0);
        if (current >= capacity) status = 'waitlist';
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await sql`
        INSERT INTO bookings (id, "userId", "hostId", "listingType", "listingId", status, "startAt", "endAt", "createdAt", "updatedAt")
        VALUES (${id}, ${targetUserId}, ${hostId}, 'event', ${eventId}, ${status}, ${startAt}, ${endAt}, ${now}, ${now})
      `;
      const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
      return res.status(201).json({ booking: rows[0] });
    }

    try {
      const {
        listingType,
        listingId,
        hostId,
        startAt,
        endAt,
        notes,
      } = body;

      if (!listingType || !listingId) {
        return res.status(400).json({ message: 'listingType and listingId are required' });
      }

      // Prevent duplicate: return existing non-cancelled booking if user already booked this listing
      const existing = await sql`
        SELECT * FROM bookings
        WHERE "userId" = ${user.id} AND "listingType" = ${String(listingType)} AND "listingId" = ${String(listingId)}
        AND status IN ('pending', 'confirmed', 'waitlist')
        LIMIT 1
      `;
      if (existing.length > 0) {
        return res.status(201).json({ booking: existing[0] });
      }

      // For events: check capacity and use waitlist if full
      let status = 'pending';
      if (listingType === 'event' && listingId) {
        const ev = await sql`SELECT capacity FROM events WHERE id = ${String(listingId)}`;
        const capacity = ev[0] ? Number((ev[0] as { capacity: number | null }).capacity) : null;
        if (capacity != null && capacity > 0) {
          const count = await sql`
            SELECT COUNT(*)::int AS c FROM bookings
            WHERE "listingType" = 'event' AND "listingId" = ${String(listingId)} AND status IN ('pending', 'confirmed')
          `;
          const current = Number((count[0] as { c: number })?.c ?? 0);
          if (current >= capacity) status = 'waitlist';
        }
      }

      // hostId must reference a real user; mock IDs like "host-1" are invalid
      let validHostId: string | null = null;
      if (hostId && typeof hostId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hostId)) {
        const hostExists = await sql`SELECT id FROM users WHERE id = ${hostId}`;
        if (hostExists.length > 0) validHostId = hostId;
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const rows = await sql`
        INSERT INTO bookings (
          id,
          "userId",
          "hostId",
          "listingType",
          "listingId",
          status,
          "startAt",
          "endAt",
          notes,
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${user.id},
          ${validHostId},
          ${String(listingType)},
          ${String(listingId)},
          ${status},
          ${startAt || null},
          ${endAt || null},
          ${notes || null},
          ${now},
          ${now}
        )
        RETURNING *
      `;

      return res.status(201).json({ booking: rows[0] });
    } catch (err) {
      console.error('Create booking error:', err);
      return res.status(500).json({ message: 'Failed to create booking' });
    }
  }

  // Handle GET /api/bookings (list)
  if (req.method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const scope = typeof req.query.scope === 'string' ? req.query.scope : 'mine';

      if (scope === 'host') {
        if (user.role !== 'host' && user.role !== 'admin') {
          return res.status(403).json({ message: 'Host access required' });
        }

        const rows = await sql`
          SELECT *
          FROM bookings
          WHERE "hostId" = ${user.id}
          ORDER BY "createdAt" DESC
        `;
        return res.json({ bookings: rows });
      }

      const rows = await sql`
        SELECT *
        FROM bookings
        WHERE "userId" = ${user.id}
        ORDER BY "createdAt" DESC
      `;
      return res.json({ bookings: rows });
    } catch (err) {
      console.error('List bookings error:', err);
      return res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
