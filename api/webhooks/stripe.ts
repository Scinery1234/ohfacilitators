/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for the OhPlaces booking flow.
 *
 * SECURITY: Raw body must be used for signature verification.
 * Vercel does NOT auto-parse this route — bodyParser is disabled below.
 *
 * Critical flow on payment_intent.succeeded:
 *   1. Mark booking confirmed in DB
 *   2. Reserve Cal.com slot (AFTER payment, never before)
 *   3. Send Twilio SMS confirmation
 *   4. Queue 24h + 1h SMS reminders (handled by cron)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../server-lib/db.js';

// Vercel: disable body parsing so we get the raw buffer for Stripe signature verification
export const config = { api: { bodyParser: false } };

/** Read the raw request body as a Buffer */
function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Send a Twilio SMS using the REST API (no SDK dependency required) */
async function sendSms(to: string, body: string, fromNumber: string, accountSid: string, authToken: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Twilio SMS failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

/** Reserve a Cal.com slot after payment is confirmed */
async function reserveCalSlot(calApiKey: string, calEventTypeId: string, startTime: string, attendeeName: string, attendeeEmail: string, attendeePhone: string) {
  const resp = await fetch('https://api.cal.com/v1/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${calApiKey}`,
    },
    body: JSON.stringify({
      eventTypeId: Number(calEventTypeId),
      start: startTime,
      responses: {
        name: attendeeName,
        email: attendeeEmail,
        phone: attendeePhone,
      },
      timeZone: 'UTC',
      language: 'en',
      metadata: {},
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cal.com reservation failed (${resp.status}): ${text}`);
  }
  return resp.json() as Promise<{ uid: string }>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeWebhookSecret || !stripeSecretKey) {
    console.error('Stripe env vars not configured');
    return res.status(500).json({ message: 'Webhook not configured' });
  }

  // Read raw body BEFORE any parsing
  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ message: 'Missing stripe-signature header' });
  }

  // ── Stripe signature verification ──────────────────────────────────────────
  // We implement this without the Stripe SDK to avoid adding the dependency
  // before it's installed. Once `stripe` package is added, replace with:
  //   const event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  //
  // For now: verify signature manually using HMAC-SHA256
  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    const { verifyStripeSignature } = await import('../../server-lib/stripeVerify.js');
    event = verifyStripeSignature(rawBody, signature, stripeWebhookSecret);
  } catch (err) {
    console.error('Stripe signature verification failed:', err);
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  await initDb();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as {
          id: string;
          amount: number;
          application_fee_amount?: number;
          metadata?: { booking_id?: string };
        };

        const bookingId = pi.metadata?.booking_id;
        if (!bookingId) {
          console.warn('payment_intent.succeeded: no booking_id in metadata, skipping', pi.id);
          break;
        }

        // Fetch the booking + related event + tenant info
        const rows = await sql`
          SELECT
            b.id,
            b.tenant_id,
            b."startAt",
            b.status,
            b.payment_status,
            b.sms_confirmation_sent,
            b."userId",
            e.cal_event_type_id,
            e.title AS event_title,
            t.cal_api_key,
            t.twilio_number,
            u."fullName" AS attendee_name,
            u.email AS attendee_email,
            u.phone AS attendee_phone
          FROM bookings b
          LEFT JOIN events e ON e.id = b."listingId" AND b."listingType" = 'event'
          LEFT JOIN tenants t ON t.id = b.tenant_id
          LEFT JOIN users u ON u.id = b."userId"
          WHERE b.id = ${bookingId}
          LIMIT 1
        `;

        if (rows.length === 0) {
          console.warn('payment_intent.succeeded: booking not found:', bookingId);
          break;
        }

        const booking = rows[0] as {
          id: string;
          tenant_id: string;
          startAt: string;
          status: string;
          payment_status: string;
          sms_confirmation_sent: boolean;
          userId: string;
          cal_event_type_id: string | null;
          event_title: string | null;
          cal_api_key: string | null;
          twilio_number: string | null;
          attendee_name: string | null;
          attendee_email: string | null;
          attendee_phone: string | null;
        };

        // Idempotency: skip if already confirmed (Stripe may retry webhooks)
        if (booking.payment_status === 'paid') {
          console.log('payment_intent.succeeded: already processed, skipping', bookingId);
          break;
        }

        // ── 1. Mark booking confirmed ────────────────────────────────────────
        await sql`
          UPDATE bookings
          SET
            status = 'confirmed',
            payment_status = 'paid',
            stripe_payment_intent_id = ${pi.id},
            amount_paid = ${pi.amount},
            platform_fee = ${pi.application_fee_amount ?? 0},
            "updatedAt" = NOW()
          WHERE id = ${bookingId}
        `;

        // ── 2. Reserve Cal.com slot (after payment — never before) ───────────
        let calBookingUid: string | null = null;
        if (booking.cal_api_key && booking.cal_event_type_id && booking.startAt) {
          try {
            const calResult = await reserveCalSlot(
              booking.cal_api_key,
              booking.cal_event_type_id,
              booking.startAt,
              booking.attendee_name ?? 'Participant',
              booking.attendee_email ?? '',
              booking.attendee_phone ?? '',
            );
            calBookingUid = calResult.uid;
            await sql`
              UPDATE bookings SET cal_booking_uid = ${calBookingUid} WHERE id = ${bookingId}
            `;
          } catch (calErr) {
            // Log but don't fail the webhook — payment is confirmed, slot issue is recoverable
            console.error('Cal.com slot reservation failed for booking', bookingId, calErr);
          }
        }

        // ── 3. Send SMS confirmation ─────────────────────────────────────────
        if (
          !booking.sms_confirmation_sent &&
          booking.attendee_phone &&
          booking.twilio_number &&
          process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN
        ) {
          try {
            const eventTitle = booking.event_title ?? 'your session';
            const startFormatted = booking.startAt
              ? new Date(booking.startAt).toLocaleString('en-AU', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Australia/Sydney',
                })
              : 'TBC';

            await sendSms(
              booking.attendee_phone,
              `Booking confirmed! You're booked for ${eventTitle} on ${startFormatted}. See you there.`,
              booking.twilio_number,
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN,
            );

            // Atomically mark SMS sent (prevents duplicate if webhook retried)
            await sql`
              UPDATE bookings
              SET sms_confirmation_sent = true
              WHERE id = ${bookingId} AND sms_confirmation_sent = false
            `;
          } catch (smsErr) {
            // Log but don't fail — payment is processed, SMS is best-effort recoverable
            console.error('SMS confirmation failed for booking', bookingId, smsErr);
          }
        }

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as {
          payment_intent?: string;
          amount_refunded: number;
        };

        if (!charge.payment_intent) break;

        await sql`
          UPDATE bookings
          SET
            status = 'cancelled',
            payment_status = 'refunded',
            "updatedAt" = NOW()
          WHERE stripe_payment_intent_id = ${charge.payment_intent as string}
        `;
        break;
      }

      default:
        // Unhandled event type — return 200 so Stripe doesn't retry
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    // Return 500 so Stripe retries — only for unexpected errors, not idempotency
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
}
