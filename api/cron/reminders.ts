/**
 * POST /api/cron/reminders
 *
 * Vercel Cron job — runs every 30 minutes.
 * Sends SMS reminders to participants:
 *   - 24h reminder: sent when start_time is 23h–25h from now
 *   - 1h reminder:  sent when start_time is 45min–75min from now
 *
 * Auth: Vercel passes the CRON_SECRET via Authorization header.
 *       Reject any request that doesn't include it.
 *
 * Idempotency: Each reminder flag (sms_reminder_24h_sent, sms_reminder_1h_sent)
 * is set atomically in the WHERE clause of the UPDATE. If this job runs twice
 * within the same window, the second run will find no eligible rows.
 *
 * Schedule: */30 * * * * (every 30 minutes) — configured in vercel.json
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../server-lib/db.js';

async function sendSms(
  to: string,
  body: string,
  fromNumber: string,
  accountSid: string,
  authToken: string,
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Twilio error (${resp.status}): ${text}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sends POST; allow GET for manual health checks in dev
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Authenticate cron request
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error('CRON_SECRET not set in production — refusing to run');
    return res.status(500).json({ message: 'Cron not configured' });
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;

  await initDb();

  const results = {
    reminder_24h: { sent: 0, failed: 0 },
    reminder_1h: { sent: 0, failed: 0 },
  };

  // ─── 24-hour reminders ────────────────────────────────────────────────────
  // Window: start_time is between NOW()+23h and NOW()+25h
  const eligible24h = await sql`
    SELECT
      b.id,
      b."startAt",
      e.title AS event_title,
      t.twilio_number,
      u.phone,
      u."fullName"
    FROM bookings b
    LEFT JOIN events e ON e.id = b."listingId" AND b."listingType" = 'event'
    LEFT JOIN tenants t ON t.id = b.tenant_id
    LEFT JOIN users u ON u.id = b."userId"
    WHERE
      b.status = 'confirmed'
      AND b.sms_reminder_24h_sent = false
      AND b."startAt" > NOW() + INTERVAL '23 hours'
      AND b."startAt" < NOW() + INTERVAL '25 hours'
      AND u.phone IS NOT NULL
      AND t.twilio_number IS NOT NULL
  `;

  for (const row of eligible24h) {
    const booking = row as {
      id: string;
      startAt: string;
      event_title: string | null;
      twilio_number: string;
      phone: string;
      fullName: string | null;
    };

    // Atomically claim this reminder — only one worker will succeed
    const claimed = await sql`
      UPDATE bookings
      SET sms_reminder_24h_sent = true, "updatedAt" = NOW()
      WHERE id = ${booking.id} AND sms_reminder_24h_sent = false
      RETURNING id
    `;

    if (claimed.length === 0) continue; // Another worker beat us

    if (!twilioSid || !twilioToken) {
      console.warn('Twilio not configured — skipping SMS for booking', booking.id);
      continue;
    }

    const startFormatted = new Date(booking.startAt).toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Australia/Sydney',
    });
    const eventTitle = booking.event_title ?? 'your session';
    const name = booking.fullName?.split(' ')[0] ?? 'there';

    try {
      await sendSms(
        booking.phone,
        `Hi ${name}! Reminder: ${eventTitle} is tomorrow at ${startFormatted}. See you soon.`,
        booking.twilio_number,
        twilioSid,
        twilioToken,
      );
      results.reminder_24h.sent++;
    } catch (err) {
      console.error('24h SMS failed for booking', booking.id, err);
      // Roll back the flag so next cron run can retry
      await sql`
        UPDATE bookings SET sms_reminder_24h_sent = false WHERE id = ${booking.id}
      `;
      results.reminder_24h.failed++;
    }
  }

  // ─── 1-hour reminders ─────────────────────────────────────────────────────
  // Window: start_time is between NOW()+45min and NOW()+75min
  const eligible1h = await sql`
    SELECT
      b.id,
      b."startAt",
      e.title AS event_title,
      t.twilio_number,
      u.phone,
      u."fullName"
    FROM bookings b
    LEFT JOIN events e ON e.id = b."listingId" AND b."listingType" = 'event'
    LEFT JOIN tenants t ON t.id = b.tenant_id
    LEFT JOIN users u ON u.id = b."userId"
    WHERE
      b.status = 'confirmed'
      AND b.sms_reminder_1h_sent = false
      AND b."startAt" > NOW() + INTERVAL '45 minutes'
      AND b."startAt" < NOW() + INTERVAL '75 minutes'
      AND u.phone IS NOT NULL
      AND t.twilio_number IS NOT NULL
  `;

  for (const row of eligible1h) {
    const booking = row as {
      id: string;
      startAt: string;
      event_title: string | null;
      twilio_number: string;
      phone: string;
      fullName: string | null;
    };

    const claimed = await sql`
      UPDATE bookings
      SET sms_reminder_1h_sent = true, "updatedAt" = NOW()
      WHERE id = ${booking.id} AND sms_reminder_1h_sent = false
      RETURNING id
    `;

    if (claimed.length === 0) continue;

    if (!twilioSid || !twilioToken) {
      console.warn('Twilio not configured — skipping SMS for booking', booking.id);
      continue;
    }

    const startFormatted = new Date(booking.startAt).toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Australia/Sydney',
    });
    const eventTitle = booking.event_title ?? 'your session';
    const name = booking.fullName?.split(' ')[0] ?? 'there';

    try {
      await sendSms(
        booking.phone,
        `Hi ${name}! ${eventTitle} starts in about 1 hour at ${startFormatted}. See you soon!`,
        booking.twilio_number,
        twilioSid,
        twilioToken,
      );
      results.reminder_1h.sent++;
    } catch (err) {
      console.error('1h SMS failed for booking', booking.id, err);
      await sql`
        UPDATE bookings SET sms_reminder_1h_sent = false WHERE id = ${booking.id}
      `;
      results.reminder_1h.failed++;
    }
  }

  return res.status(200).json({ ok: true, results });
}
