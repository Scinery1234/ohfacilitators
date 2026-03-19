/**
 * Manual Stripe webhook signature verification.
 *
 * This replicates what stripe.webhooks.constructEvent() does internally,
 * allowing us to verify signatures without the `stripe` npm package installed.
 *
 * Once `stripe` is added as a dependency, replace calls to this module with:
 *   import Stripe from 'stripe';
 *   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
 *   const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
 *
 * Stripe signature format:
 *   stripe-signature: t=<timestamp>,v1=<hmac_sha256_hex>,...
 *
 * Verification:
 *   1. Extract timestamp and v1 signature(s)
 *   2. Compute HMAC-SHA256 of "<timestamp>.<rawBody>" using the webhook secret
 *   3. Compare computed signature against v1 (constant-time comparison)
 *   4. Reject if timestamp is more than 5 minutes old (replay attack prevention)
 */
import crypto from 'crypto';

const TOLERANCE_SECONDS = 300; // 5 minutes

export function verifyStripeSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): { type: string; data: { object: Record<string, unknown> } } {
  // Parse the signature header
  const parts: Record<string, string[]> = {};
  for (const part of signature.split(',')) {
    const [key, ...rest] = part.split('=');
    if (!parts[key]) parts[key] = [];
    parts[key].push(rest.join('='));
  }

  const timestamp = parts['t']?.[0];
  const v1Signatures = parts['v1'] ?? [];

  if (!timestamp || v1Signatures.length === 0) {
    throw new Error('Malformed stripe-signature header');
  }

  // Replay attack check
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) {
    throw new Error(`Stripe webhook timestamp too old: ${timestamp}`);
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  // Constant-time comparison against all provided v1 signatures
  const valid = v1Signatures.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  });

  if (!valid) {
    throw new Error('Stripe signature mismatch');
  }

  // Parse and return the event payload
  return JSON.parse(rawBody.toString('utf8'));
}
