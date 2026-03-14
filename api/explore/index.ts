import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../server-lib/db.js';

/**
 * Unified "Explore" endpoint - loads all initial data in one request
 * Dramatically reduces latency by eliminating multiple round trips
 * Responses are cached for 60 seconds on the CDN
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initDb();

  try {
    // Set aggressive caching headers for public data (longer TTL for edge)
    // origin max-age is 300s, CDN edge s-maxage is 600s for faster subsequent loads
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.setHeader('CDN-Cache-Control', 'max-age=600');

    // Fetch all data in parallel for better performance
    const [communitiesResult, placesResult, eventsResult] = await Promise.all([
      // Get communities (first 20)
      sql`
        SELECT c.id, c.name, c.slug, c.description, c.visibility, c."locationArea", c.type, c."imageUrl", c."createdAt"
        FROM communities c
        WHERE c.visibility IN ('public', 'unlisted')
        ORDER BY c."createdAt" DESC
        LIMIT 20
      `,
      // Get places (first 12) with lat/lng for map
      sql`
        SELECT p.id, p.title, p.description, p.address, p.lat, p.lng, p."imageUrl", p."createdBy", p."createdAt",
          u."fullName" AS "creatorName"
        FROM places p
        LEFT JOIN users u ON u.id = p."createdBy"
        WHERE p.visibility = 'public'
        ORDER BY p."createdAt" DESC
        LIMIT 12
      `,
      // Get events (first 12) with place and community tags
      sql`
        SELECT e.id, e.title, e.description, e."imageUrl", e."placeId", e."communityId", e."startAt", e."createdBy", e."createdAt",
          p.title AS "placeTitle", p.address AS "placeAddress",
          c.name AS "communityName", c.slug AS "communitySlug",
          u."fullName" AS "creatorName"
        FROM events e
        LEFT JOIN places p ON p.id = e."placeId"
        LEFT JOIN communities c ON c.id = e."communityId"
        LEFT JOIN users u ON u.id = e."createdBy"
        WHERE e.visibility = 'public'
        ORDER BY e."startAt" DESC
        LIMIT 12
      `,
    ]);

    return res.json({
      communities: communitiesResult.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        visibility: r.visibility,
        locationArea: r.locationArea ?? null,
        type: r.type ?? 'open',
        imageUrl: r.imageUrl ?? null,
        createdAt: r.createdAt,
      })),
      places: placesResult.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        address: r.address,
        lat: (r as { lat?: number }).lat ?? null,
        lng: (r as { lng?: number }).lng ?? null,
        imageUrl: r.imageUrl ?? null,
        createdBy: r.createdBy,
        creatorName: r.creatorName ?? null,
        createdAt: r.createdAt,
      })),
      events: eventsResult.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrl: r.imageUrl ?? null,
        startAt: r.startAt,
        placeId: r.placeId,
        placeTitle: (r as { placeTitle?: string }).placeTitle ?? null,
        placeAddress: (r as { placeAddress?: string }).placeAddress ?? null,
        communityId: (r as { communityId?: string }).communityId ?? null,
        communityName: (r as { communityName?: string }).communityName ?? null,
        communitySlug: (r as { communitySlug?: string }).communitySlug ?? null,
        createdBy: r.createdBy,
        creatorName: r.creatorName ?? null,
        createdAt: r.createdAt,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Explore endpoint error:', err);
    return res.status(500).json({ message: 'Failed to fetch explore data' });
  }
}
