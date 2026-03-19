import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { verifyToken } from '../../server-lib/auth.js';

/**
 * Create a Stripe Checkout Session via the REST API (no SDK required).
 * Returns the session URL to redirect the participant.
 *
 * SECURITY: Amount is always read from the database — never from the client request.
 */
async function createStripeCheckoutSession(opts: {
  stripeSecretKey: string;
  stripeAccountId: string;
  amountCents: number;
  platformFeeCents: number;
  eventTitle: string;
  bookingId: string;
  participantEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const params = new URLSearchParams({
    'payment_method_types[]': 'card',
    mode: 'payment',
    'line_items[0][price_data][currency]': 'aud',
    'line_items[0][price_data][product_data][name]': opts.eventTitle,
    'line_items[0][price_data][unit_amount]': String(opts.amountCents),
    'line_items[0][quantity]': '1',
    'payment_intent_data[application_fee_amount]': String(opts.platformFeeCents),
    'payment_intent_data[transfer_data][destination]': opts.stripeAccountId,
    'payment_intent_data[metadata][booking_id]': opts.bookingId,
    customer_email: opts.participantEmail,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Stripe Checkout error (${resp.status}): ${body}`);
  }

  const session = (await resp.json()) as { id: string; url: string };
  return { url: session.url, sessionId: session.id };
}

async function requireAuth(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const { userId } = verifyToken(token);
    const rows = await sql`SELECT id, email, role FROM users WHERE id = ${userId}`;
    if (rows.length === 0) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return null;
    }
    return rows[0] as { id: string; email: string; role: string };
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

    // ── Event booking with Stripe checkout (participant flow) ──────────────────
    const { eventId, slotTime, notes, successUrl, cancelUrl } = body;

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ message: 'eventId is required' });
    }
    if (!slotTime || typeof slotTime !== 'string') {
      return res.status(400).json({ message: 'slotTime is required' });
    }

    // ── 1. Fetch event + tenant data (price is ALWAYS from DB, never client) ──
    const evRows = await sql`
      SELECT
        e.id,
        e.title,
        e."startAt",
        e."endAt",
        e.capacity,
        e.price,
        e.pricing_type,
        e.tenant_id,
        e.host_id,
        t.stripe_account_id,
        t.name AS tenant_name
      FROM events e
      LEFT JOIN tenants t ON t.id = e.tenant_id
      WHERE e.id = ${eventId}
        AND e.visibility = 'public'
      LIMIT 1
    `;

    if (evRows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not available' });
    }

    const ev = evRows[0] as {
      id: string;
      title: string;
      startAt: string | null;
      endAt: string | null;
      capacity: number | null;
      price: number;
      pricing_type: string;
      tenant_id: string | null;
      host_id: string | null;
      stripe_account_id: string | null;
      tenant_name: string | null;
    };

    // ── 2. Prevent duplicate booking ──────────────────────────────────────────
    const existingBooking = await sql`
      SELECT id, status, payment_status, stripe_payment_intent_id
      FROM bookings
      WHERE "userId" = ${user.id}
        AND "listingType" = 'event'
        AND "listingId" = ${eventId}
        AND status IN ('pending', 'confirmed', 'waitlist')
      LIMIT 1
    `;
    if (existingBooking.length > 0) {
      return res.status(409).json({
        message: 'You already have a booking for this event',
        booking: existingBooking[0],
      });
    }

    const bookingId = crypto.randomUUID();
    const cancellationToken = crypto.randomBytes(32).toString('hex');

    // ── 3. Atomic capacity-safe INSERT ────────────────────────────────────────
    // The WHERE clause prevents inserting when at capacity — eliminates the
    // read-then-write race condition in the original implementation.
    const capacity = ev.capacity != null && ev.capacity > 0 ? ev.capacity : null;

    const inserted = await sql`
      INSERT INTO bookings (
        id, "userId", "hostId", "listingType", "listingId",
        status, payment_status, "startAt", "endAt", notes,
        tenant_id, cancellation_token, "createdAt", "updatedAt"
      )
      SELECT
        ${bookingId},
        ${user.id},
        ${ev.host_id ?? null},
        'event',
        ${eventId},
        'pending',
        ${ev.price > 0 ? 'awaiting_payment' : 'not_required'},
        ${slotTime},
        ${ev.endAt ?? null},
        ${notes ?? null},
        ${ev.tenant_id ?? null},
        ${cancellationToken},
        NOW(), NOW()
      WHERE
        ${capacity === null ? sql`TRUE` : sql`
          (SELECT COUNT(*) FROM bookings
           WHERE "listingId" = ${eventId}
             AND "listingType" = 'event'
             AND status IN ('pending', 'confirmed')) < ${capacity}
        `}
      RETURNING *
    `;

    if (inserted.length === 0) {
      return res.status(409).json({ message: 'Event is fully booked' });
    }

    // ── 4a. Free event — confirm immediately ──────────────────────────────────
    if (ev.price === 0 || ev.pricing_type === 'free') {
      await sql`
        UPDATE bookings
        SET status = 'confirmed', payment_status = 'not_required', "updatedAt" = NOW()
        WHERE id = ${bookingId}
      `;
      const confirmed = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
      return res.status(201).json({ booking: confirmed[0], checkoutUrl: null });
    }

    // ── 4b. Paid event — create Stripe Checkout Session ───────────────────────
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      // Payment not configured — fail gracefully, clean up the pending booking
      await sql`DELETE FROM bookings WHERE id = ${bookingId}`;
      return res.status(503).json({ message: 'Payment processing is not configured' });
    }

    if (!ev.stripe_account_id) {
      await sql`DELETE FROM bookings WHERE id = ${bookingId}`;
      return res.status(503).json({ message: 'Host payment account is not configured' });
    }

    // Platform fee: 10% of booking amount (adjust as needed)
    const platformFeeCents = Math.round(ev.price * 0.1);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (req.headers.origin as string) ?? '';
    const stripeSuccessUrl = successUrl ?? `${baseUrl}/booking/${bookingId}?payment=success`;
    const stripeCancelUrl = cancelUrl ?? `${baseUrl}/booking/${bookingId}?payment=cancelled`;

    try {
      const { url: checkoutUrl } = await createStripeCheckoutSession({
        stripeSecretKey,
        stripeAccountId: ev.stripe_account_id,
        amountCents: ev.price,
        platformFeeCents,
        eventTitle: ev.title,
        bookingId,
        participantEmail: user.email ?? '',
        successUrl: stripeSuccessUrl,
        cancelUrl: stripeCancelUrl,
      });

      return res.status(201).json({
        booking: inserted[0],
        checkoutUrl,
      });
    } catch (stripeErr) {
      console.error('Stripe checkout session creation failed:', stripeErr);
      // Clean up the pending booking on Stripe failure
      await sql`DELETE FROM bookings WHERE id = ${bookingId}`;
      return res.status(502).json({ message: 'Failed to create payment session' });
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
