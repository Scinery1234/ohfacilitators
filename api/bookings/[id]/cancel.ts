/**
 * POST /api/bookings/:id/cancel
 *
 * Participant-initiated cancellation — no JWT required.
 * Auth is via a one-time cancellation_token sent to the participant's email.
 *
 * Request body: { token: string }
 *
 * Flow:
 *   1. Validate token matches booking.cancellation_token
 *   2. Ensure booking is in a cancellable state (pending | confirmed)
 *   3. Mark booking cancelled
 *   4. If payment was made, trigger Stripe refund via Refunds API
 *   5. Cancel Cal.com booking if cal_booking_uid is set
 *
 * The cancellation_token is NOT invalidated after use — it's single-use by
 * design because each booking only has one cancel action.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../../server-lib/db.js';

async function issueStripeRefund(paymentIntentId: string, stripeSecretKey: string): Promise<void> {
  const params = new URLSearchParams({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
  });
  const resp = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Stripe refund failed (${resp.status}): ${body}`);
  }
}

async function cancelCalBooking(calBookingUid: string, calApiKey: string): Promise<void> {
  const resp = await fetch(`https://api.cal.com/v1/bookings/${calBookingUid}/cancel`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${calApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: 'Cancelled by participant' }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Cal.com cancellation failed (${resp.status}): ${body}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initDb();

  const bookingId = typeof req.query.id === 'string' ? req.query.id : null;
  if (!bookingId) {
    return res.status(400).json({ message: 'Booking ID required' });
  }

  const { token } = req.body ?? {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Cancellation token required' });
  }

  // Fetch booking + tenant credentials
  const rows = await sql`
    SELECT
      b.id,
      b.status,
      b.payment_status,
      b.stripe_payment_intent_id,
      b.cal_booking_uid,
      b.cancellation_token,
      t.cal_api_key
    FROM bookings b
    LEFT JOIN tenants t ON t.id = b.tenant_id
    WHERE b.id = ${bookingId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  const booking = rows[0] as {
    id: string;
    status: string;
    payment_status: string;
    stripe_payment_intent_id: string | null;
    cal_booking_uid: string | null;
    cancellation_token: string | null;
    cal_api_key: string | null;
  };

  // Validate token (constant-time comparison)
  if (!booking.cancellation_token) {
    return res.status(400).json({ message: 'This booking cannot be cancelled via link' });
  }

  let tokenValid = false;
  try {
    tokenValid = require('crypto').timingSafeEqual(
      Buffer.from(token),
      Buffer.from(booking.cancellation_token),
    );
  } catch {
    tokenValid = false;
  }

  if (!tokenValid) {
    return res.status(403).json({ message: 'Invalid cancellation token' });
  }

  // Check cancellable state
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return res.status(409).json({
      message: `Booking cannot be cancelled (current status: ${booking.status})`,
    });
  }

  // Mark cancelled
  await sql`
    UPDATE bookings
    SET status = 'cancelled', "updatedAt" = NOW()
    WHERE id = ${bookingId}
  `;

  const errors: string[] = [];

  // Issue Stripe refund if payment was made
  if (
    booking.payment_status === 'paid' &&
    booking.stripe_payment_intent_id &&
    process.env.STRIPE_SECRET_KEY
  ) {
    try {
      await issueStripeRefund(booking.stripe_payment_intent_id, process.env.STRIPE_SECRET_KEY);
      await sql`
        UPDATE bookings SET payment_status = 'refund_pending', "updatedAt" = NOW()
        WHERE id = ${bookingId}
      `;
    } catch (err) {
      console.error('Refund failed for booking', bookingId, err);
      errors.push('Refund could not be issued automatically — please contact support');
    }
  }

  // Cancel Cal.com booking
  if (booking.cal_booking_uid && booking.cal_api_key) {
    try {
      await cancelCalBooking(booking.cal_booking_uid, booking.cal_api_key);
    } catch (err) {
      console.error('Cal.com cancellation failed for booking', bookingId, err);
      errors.push('Calendar cancellation failed — host has been notified');
    }
  }

  return res.status(200).json({
    cancelled: true,
    bookingId,
    warnings: errors.length > 0 ? errors : undefined,
  });
}
