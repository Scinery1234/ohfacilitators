/**
 * GET /api/hosts/:slug
 *
 * Public endpoint — no auth required.
 * Returns tenant branding + host profile for the participant-facing booking page.
 * Participants and Purposefields discovery call this; must NEVER expose internal
 * fields (stripe_account_id, cal_api_key, twilio_number, etc.).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../server-lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initDb();

  const slug = typeof req.query.slug === 'string' ? req.query.slug.toLowerCase().trim() : null;
  if (!slug) {
    return res.status(400).json({ message: 'Tenant slug is required' });
  }

  try {
    const rows = await sql`
      SELECT
        t.id,
        t.slug,
        t.name,
        t.logo_url,
        t.primary_color,
        t.purposefields_opt_in
      FROM tenants t
      WHERE t.slug = ${slug}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Host not found' });
    }

    const tenant = rows[0];

    // Fetch the host user profile (the tenant owner)
    const hostRows = await sql`
      SELECT
        u.id,
        u."fullName" AS name,
        u."avatarUrl",
        u.bio,
        u."locationArea"
      FROM users u
      WHERE u.tenant_id = ${tenant.id}
        AND u.role IN ('host', 'admin')
      ORDER BY u."createdAt" ASC
      LIMIT 1
    `;

    const host = hostRows.length > 0 ? hostRows[0] : null;

    // Upcoming public events for this tenant
    const eventRows = await sql`
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
        v.name AS venue_name,
        v.suburb,
        v.city
      FROM events e
      LEFT JOIN venues v ON v.id = e.venue_id
      WHERE e.tenant_id = ${tenant.id}
        AND e.visibility = 'public'
        AND e."startAt" > NOW()
      ORDER BY e."startAt" ASC
      LIMIT 20
    `;

    // Short CDN cache — branding rarely changes
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

    return res.json({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        logoUrl: tenant.logo_url ?? null,
        primaryColor: tenant.primary_color ?? '#000000',
        purposefieldsOptIn: tenant.purposefields_opt_in ?? false,
      },
      host,
      upcomingEvents: eventRows.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description ?? null,
        imageUrl: e.imageUrl ?? null,
        startAt: e.startAt,
        endAt: e.endAt ?? null,
        capacity: e.capacity ?? null,
        price: e.price ?? 0,
        pricingType: e.pricing_type ?? 'free',
        modality: e.modality ?? 'in_person',
        venue: e.venue_name
          ? { name: e.venue_name, suburb: e.suburb ?? null, city: e.city ?? null }
          : null,
      })),
    });
  } catch (err) {
    console.error('GET /api/hosts/:slug error:', err);
    return res.status(500).json({ message: 'Failed to fetch host profile' });
  }
}
