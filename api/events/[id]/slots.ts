/**
 * GET /api/events/:id/slots
 *
 * Proxy to Cal.com to fetch available time slots for a specific event.
 * Uses the tenant's Cal.com API key — participants never see it.
 *
 * Query params:
 *   - startTime: ISO 8601 start of the fetch window (default: now)
 *   - endTime:   ISO 8601 end of the fetch window (default: +30 days)
 *   - timeZone:  IANA timezone string (default: UTC)
 *
 * Returns: { slots: Array<{ time: string; available: boolean }> }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../../server-lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initDb();

  const eventId = typeof req.query.id === 'string' ? req.query.id : null;
  if (!eventId) {
    return res.status(400).json({ message: 'Event ID required' });
  }

  // Fetch the event and its tenant's Cal.com credentials
  const rows = await sql`
    SELECT
      e.id,
      e.cal_event_type_id,
      e."startAt",
      e."endAt",
      t.cal_api_key
    FROM events e
    LEFT JOIN tenants t ON t.id = e.tenant_id
    WHERE e.id = ${eventId}
      AND e.visibility = 'public'
    LIMIT 1
  `;

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Event not found' });
  }

  const event = rows[0] as {
    id: string;
    cal_event_type_id: string | null;
    startAt: string | null;
    endAt: string | null;
    cal_api_key: string | null;
  };

  if (!event.cal_event_type_id) {
    // Event is not Cal.com-backed — return the single session time if set
    if (event.startAt) {
      return res.json({
        slots: [{ time: event.startAt, available: true }],
      });
    }
    return res.status(400).json({ message: 'Event has no Cal.com event type configured' });
  }

  if (!event.cal_api_key) {
    return res.status(503).json({ message: 'Booking not available for this host' });
  }

  // Build Cal.com request params
  const startTime =
    typeof req.query.startTime === 'string'
      ? req.query.startTime
      : new Date().toISOString();

  const endTime =
    typeof req.query.endTime === 'string'
      ? req.query.endTime
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const timeZone =
    typeof req.query.timeZone === 'string' ? req.query.timeZone : 'UTC';

  try {
    const calUrl = new URL('https://api.cal.com/v1/slots/available');
    calUrl.searchParams.set('eventTypeId', event.cal_event_type_id);
    calUrl.searchParams.set('startTime', startTime);
    calUrl.searchParams.set('endTime', endTime);
    calUrl.searchParams.set('timeZone', timeZone);

    const calResp = await fetch(calUrl.toString(), {
      headers: { Authorization: `Bearer ${event.cal_api_key}` },
    });

    if (!calResp.ok) {
      const body = await calResp.text();
      console.error('Cal.com slots API error:', calResp.status, body);
      return res.status(502).json({ message: 'Failed to fetch available slots' });
    }

    const data = (await calResp.json()) as {
      slots: Record<string, { time: string }[]>;
    };

    // Flatten the date-keyed map into a flat array of slot times
    const slots = Object.values(data.slots ?? {})
      .flat()
      .map((s) => ({ time: s.time, available: true }))
      .sort((a, b) => a.time.localeCompare(b.time));

    // Short cache — slots change frequently
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60');
    return res.json({ slots });
  } catch (err) {
    console.error('Slots fetch error:', err);
    return res.status(500).json({ message: 'Failed to fetch available slots' });
  }
}
