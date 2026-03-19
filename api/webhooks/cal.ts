/**
 * POST /api/webhooks/cal
 *
 * Handles Cal.com webhook events.
 *
 * Cal.com fires these when its own booking lifecycle changes — for example
 * if a host cancels directly inside Cal.com dashboard.
 *
 * Events handled:
 *   - BOOKING_CREATED   — update cal_booking_uid if not already set
 *   - BOOKING_CANCELLED — mark our booking cancelled + notify participant
 *   - BOOKING_RESCHEDULED — update start/end times
 *
 * Cal.com webhook secret: set CAL_WEBHOOK_SECRET in env.
 * Cal.com signs requests with HMAC-SHA256 in the `X-Cal-Signature-256` header.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';

export const config = { api: { bodyParser: false } };

function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyCalSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('sha256=', ''), 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const calSecret = process.env.CAL_WEBHOOK_SECRET;

  // Verify Cal.com signature if secret is configured
  if (calSecret) {
    const signature = (req.headers['x-cal-signature-256'] ?? '') as string;
    if (!signature || !verifyCalSignature(rawBody, signature, calSecret)) {
      return res.status(400).json({ message: 'Invalid Cal.com webhook signature' });
    }
  } else {
    console.warn('CAL_WEBHOOK_SECRET not set — skipping Cal.com signature verification');
  }

  await initDb();

  let payload: {
    triggerEvent: string;
    payload: {
      uid?: string;
      startTime?: string;
      endTime?: string;
      attendees?: { email?: string }[];
    };
  };

  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ message: 'Invalid JSON payload' });
  }

  const { triggerEvent, payload: data } = payload;

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED': {
        // Cal.com created a booking — store the uid if we don't have it yet
        if (data.uid) {
          await sql`
            UPDATE bookings
            SET cal_booking_uid = ${data.uid}, "updatedAt" = NOW()
            WHERE cal_booking_uid IS NULL
              AND "startAt" = ${data.startTime ?? null}
              AND "listingType" = 'event'
          `;
        }
        break;
      }

      case 'BOOKING_CANCELLED': {
        // Host cancelled inside Cal.com — mirror cancellation to our DB
        if (data.uid) {
          await sql`
            UPDATE bookings
            SET
              status = 'cancelled',
              "updatedAt" = NOW()
            WHERE cal_booking_uid = ${data.uid}
              AND status NOT IN ('cancelled', 'refunded')
          `;
        }
        break;
      }

      case 'BOOKING_RESCHEDULED': {
        // Host rescheduled inside Cal.com — update times
        if (data.uid && data.startTime) {
          await sql`
            UPDATE bookings
            SET
              "startAt" = ${data.startTime},
              "endAt" = ${data.endTime ?? null},
              -- Reset reminder flags so new reminders are sent for the new time
              sms_reminder_24h_sent = false,
              sms_reminder_1h_sent = false,
              "updatedAt" = NOW()
            WHERE cal_booking_uid = ${data.uid}
          `;
        }
        break;
      }

      default:
        // Unknown event — return 200 so Cal.com doesn't retry
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Cal.com webhook handler error:', err);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
}
