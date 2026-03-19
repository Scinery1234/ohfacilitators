/**
 * POST   /api/dashboard/events        — create a new event
 * DELETE /api/dashboard/events?id=:id — cancel event + notify participants
 *
 * Host-facing — JWT required for both.
 * Events are scoped to the host's tenant.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../../server-lib/db.js';
import { requireAuth } from '../../../server-lib/requireAuth.js';

/**
 * Send a Twilio SMS notification to all confirmed participants when an event
 * is cancelled by the host.
 */
async function notifyParticipants(
  participants: { phone: string | null; name: string | null }[],
  eventTitle: string,
  fromNumber: string,
  accountSid: string,
  authToken: string,
): Promise<void> {
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const sends = participants
    .filter((p) => p.phone)
    .map(async (p) => {
      const firstName = p.name?.split(' ')[0] ?? 'there';
      const body = `Hi ${firstName}, we're sorry but ${eventTitle} has been cancelled. You will receive a full refund if applicable.`;
      const params = new URLSearchParams({ To: p.phone!, From: fromNumber, Body: body });
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        if (!resp.ok) {
          console.error('SMS notification failed for participant', p.phone, await resp.text());
        }
      } catch (err) {
        console.error('SMS notification error for participant', p.phone, err);
      }
    });

  await Promise.allSettled(sends);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();

  const user = await requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'host' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Host access required' });
  }

  // ── POST: Create event ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      title,
      description,
      imageUrl,
      venueId,
      startAt,
      endAt,
      capacity,
      price,
      pricingType,
      modality,
      calEventTypeId,
      discoverable,
      recurrenceRule,
      visibility,
    } = req.body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title is required' });
    }
    if (!startAt) {
      return res.status(400).json({ message: 'startAt is required' });
    }

    // Fetch the host's tenant
    const tenantRows = await sql`
      SELECT id, stripe_account_id FROM tenants WHERE id = (
        SELECT tenant_id FROM users WHERE id = ${user.id} LIMIT 1
      )
    `;

    const tenantId = tenantRows[0] ? (tenantRows[0] as { id: string }).id : null;

    // Validate venueId belongs to this tenant
    if (venueId) {
      const venueCheck = await sql`
        SELECT id FROM venues WHERE id = ${String(venueId)} AND tenant_id = ${tenantId}
      `;
      if (venueCheck.length === 0) {
        return res.status(400).json({ message: 'Venue not found or not accessible' });
      }
    }

    try {
      const id = crypto.randomUUID();
      const vis = ['public', 'unlisted', 'draft'].includes(visibility) ? visibility : 'draft';
      const priceCents = typeof price === 'number' && price >= 0 ? Math.round(price) : 0;

      await sql`
        INSERT INTO events (
          id, title, description, "imageUrl", venue_id, "startAt", "endAt",
          capacity, price, pricing_type, modality, cal_event_type_id,
          discoverable, recurrence_rule, visibility, host_id, tenant_id, "createdBy"
        ) VALUES (
          ${id},
          ${title.trim()},
          ${description ?? null},
          ${imageUrl ?? null},
          ${venueId ?? null},
          ${startAt},
          ${endAt ?? null},
          ${capacity ?? null},
          ${priceCents},
          ${pricingType ?? (priceCents > 0 ? 'fixed' : 'free')},
          ${modality ?? 'in_person'},
          ${calEventTypeId ?? null},
          ${discoverable === true},
          ${recurrenceRule ?? null},
          ${vis},
          ${user.id},
          ${tenantId},
          ${user.id}
        )
      `;

      // Set owner membership
      await sql`
        INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
        VALUES (${crypto.randomUUID()}, 'event', ${id}, ${user.id}, 'owner')
        ON CONFLICT ("objectType", "objectId", "userId") DO NOTHING
      `;

      const rows = await sql`SELECT * FROM events WHERE id = ${id}`;
      return res.status(201).json({ event: rows[0] });
    } catch (err) {
      console.error('POST /api/dashboard/events error:', err);
      return res.status(500).json({ message: 'Failed to create event' });
    }
  }

  // ── DELETE: Cancel event + notify participants ────────────────────────────
  if (req.method === 'DELETE') {
    const eventId = typeof req.query.id === 'string' ? req.query.id : null;
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID required' });
    }

    const eventRows = await sql`
      SELECT e.id, e.title, e.host_id, t.twilio_number, t.id AS tenant_id
      FROM events e
      LEFT JOIN tenants t ON t.id = e.tenant_id
      WHERE e.id = ${eventId}
      LIMIT 1
    `;

    if (eventRows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventRows[0] as {
      id: string;
      title: string;
      host_id: string | null;
      twilio_number: string | null;
      tenant_id: string | null;
    };

    const canDelete = user.role === 'admin' || event.host_id === user.id;
    if (!canDelete) {
      return res.status(403).json({ message: 'Not authorized to cancel this event' });
    }

    try {
      // Fetch confirmed participants for SMS notification
      const participants = await sql`
        SELECT u.phone, u."fullName" AS name
        FROM bookings b
        INNER JOIN users u ON u.id = b."userId"
        WHERE b."listingType" = 'event'
          AND b."listingId" = ${eventId}
          AND b.status IN ('confirmed', 'pending')
      `;

      // Cancel all bookings
      await sql`
        UPDATE bookings
        SET status = 'cancelled', "updatedAt" = NOW()
        WHERE "listingType" = 'event' AND "listingId" = ${eventId}
          AND status NOT IN ('cancelled', 'refunded')
      `;

      // Soft-delete: mark event cancelled (keep record for history)
      await sql`
        UPDATE events SET visibility = 'draft', "updatedAt" = NOW() WHERE id = ${eventId}
      `;

      // Notify participants via SMS (best-effort — do not fail the response)
      if (
        participants.length > 0 &&
        event.twilio_number &&
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN
      ) {
        notifyParticipants(
          participants as { phone: string | null; name: string | null }[],
          event.title,
          event.twilio_number,
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        ).catch((err) => console.error('Participant notification error:', err));
      }

      return res.status(200).json({
        cancelled: true,
        eventId,
        participantsNotified: participants.length,
      });
    } catch (err) {
      console.error('DELETE /api/dashboard/events error:', err);
      return res.status(500).json({ message: 'Failed to cancel event' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
