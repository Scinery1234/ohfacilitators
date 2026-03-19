/**
 * GET /api/dashboard/sessions
 *
 * Host-facing — JWT required.
 * Returns upcoming sessions (events) for the authenticated host's tenant.
 *
 * Query params:
 *   - past=true  — include past sessions instead of upcoming
 *   - limit      — max results (default 50)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../../server-lib/db.js';
import { requireAuth } from '../../../server-lib/requireAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initDb();

  const user = await requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'host' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Host access required' });
  }

  try {
    const past = req.query.past === 'true';
    const limit = Math.min(Number(req.query.limit ?? 50), 200);

    // Sessions are events where the authenticated user is the host
    const rows = await sql`
      SELECT
        e.id,
        e.title,
        e.description,
        e."imageUrl",
        e."startAt",
        e."endAt",
        e.capacity,
        e.price,
        e.pricing_type,
        e.modality,
        e.visibility,
        e.discoverable,
        e.cal_event_type_id,
        v.name AS venue_name,
        v.address AS venue_address,
        v.suburb AS venue_suburb,
        COALESCE(confirmed.count, 0)::int AS confirmed_count,
        COALESCE(pending.count, 0)::int AS pending_count
      FROM events e
      LEFT JOIN venues v ON v.id = e.venue_id
      LEFT JOIN (
        SELECT "listingId", COUNT(*) AS count
        FROM bookings
        WHERE "listingType" = 'event' AND status = 'confirmed'
        GROUP BY "listingId"
      ) confirmed ON confirmed."listingId" = e.id
      LEFT JOIN (
        SELECT "listingId", COUNT(*) AS count
        FROM bookings
        WHERE "listingType" = 'event' AND status = 'pending'
        GROUP BY "listingId"
      ) pending ON pending."listingId" = e.id
      WHERE e.host_id = ${user.id}
        AND ${past ? sql`e."startAt" < NOW()` : sql`e."startAt" >= NOW()`}
      ORDER BY ${past ? sql`e."startAt" DESC` : sql`e."startAt" ASC`}
      LIMIT ${limit}
    `;

    return res.json({
      sessions: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? null,
        imageUrl: r.imageUrl ?? null,
        startAt: r.startAt,
        endAt: r.endAt ?? null,
        capacity: r.capacity ?? null,
        price: r.price ?? 0,
        pricingType: r.pricing_type ?? 'free',
        modality: r.modality ?? 'in_person',
        visibility: r.visibility,
        discoverable: r.discoverable ?? false,
        calEventTypeId: r.cal_event_type_id ?? null,
        venue: r.venue_name
          ? { name: r.venue_name, address: r.venue_address, suburb: r.venue_suburb }
          : null,
        attendees: {
          confirmed: r.confirmed_count,
          pending: r.pending_count,
        },
      })),
    });
  } catch (err) {
    console.error('GET /api/dashboard/sessions error:', err);
    return res.status(500).json({ message: 'Failed to fetch sessions' });
  }
}
