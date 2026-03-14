import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { requireAuth } from '../../server-lib/requireAuth.js';
import { isAdmin } from '../../server-lib/admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();

  // Extract the place ID from either URL path or query params
  const id = typeof req.query.id === 'string' ? req.query.id : null;

  // === INDIVIDUAL PLACE ROUTES (when id is provided) ===
  if (id) {
    // GET /api/places?id=xxx (single place detail)
    if (req.method === 'GET') {
      try {
        // Public detail responses can be cached briefly at the CDN
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180');
        // First, get the place to check visibility
        const placeRows = await sql`
          SELECT visibility FROM places WHERE id = ${id}
        `;

        if (placeRows.length === 0) {
          return res.status(404).json({ message: 'Place not found' });
        }

        const place = placeRows[0];
        let user = null;
        let userRole = null;

        // For public places, allow viewing without auth
        // For unlisted/draft, require auth
        if (place.visibility !== 'public') {
          const authUser = await requireAuth(req, res);
          if (!authUser) return;
          user = authUser;

          // Check membership for non-public places
          const membership = await sql`
            SELECT role FROM object_memberships
            WHERE "objectType" = 'place' AND "objectId" = ${id} AND "userId" = ${user.id}
          `;

          if (membership.length === 0) {
            return res.status(403).json({ message: 'Place not accessible' });
          }
          userRole = membership[0].role;
        } else {
          // For public place detail responses, allow short CDN caching
          res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180');
          // For public places, try to get user role if authenticated (for edit buttons)
          const authHeader = req.headers.authorization;
          if (authHeader?.startsWith('Bearer ')) {
            try {
              const { verifyToken } = await import('../../server-lib/auth.js');
              const token = authHeader.slice(7);
              const { userId } = verifyToken(token);
              const membership = await sql`
                SELECT role FROM object_memberships
                WHERE "objectType" = 'place' AND "objectId" = ${id} AND "userId" = ${userId}
              `;
              if (membership.length > 0) {
                userRole = membership[0].role;
              }
              const u = await sql`SELECT id, email, role FROM users WHERE id = ${userId}`;
              if (u.length > 0 && isAdmin(u[0])) userRole = 'owner';
            } catch {
              // Not authenticated or invalid token - that's fine for public places
            }
          }
        }

        const rows = await sql`
          SELECT p.id, p.title, p.description, p.address, p.lat, p.lng, p."communityId", p.visibility, p."imageUrl", p."createdBy", p."createdAt"
          FROM places p
          WHERE p.id = ${id}
        `;

        const placeData = rows[0];
        const eventRows = await sql`
          SELECT e.id, e.title, e."startAt", e.visibility
          FROM events e
          WHERE e."placeId" = ${id}
          ORDER BY e."startAt" ASC
          LIMIT 20
        `;

        // Fetch collaborators from object_memberships with user names
        const collabRows = await sql`
          SELECT om."userId", om.role, u."fullName", u.email
          FROM object_memberships om
          INNER JOIN users u ON u.id = om."userId"
          WHERE om."objectType" = 'place' AND om."objectId" = ${id}
          ORDER BY 
            CASE om.role 
              WHEN 'owner' THEN 1 
              WHEN 'collaborator' THEN 2 
              ELSE 3 
            END,
            u."fullName"
        `;

        return res.json({
          place: {
            ...placeData,
            role: userRole || null,
            events: eventRows,
            collaborators: collabRows.map((r) => ({
              userId: r.userId,
              role: r.role,
              fullName: r.fullName,
              email: r.email,
            })),
          },
        });
      } catch (err) {
        console.error('Get place error:', err);
        return res.status(500).json({ message: 'Failed to fetch place' });
      }
    }

    // PATCH /api/places?id=xxx (update place)
    if (req.method === 'PATCH') {
      const user = await requireAuth(req, res);
      if (!user) return;

      const membership = await sql`
        SELECT role FROM object_memberships
        WHERE "objectType" = 'place' AND "objectId" = ${id} AND "userId" = ${user.id}
      `;
      const canEdit = isAdmin(user) || (membership.length > 0 && (membership[0].role === 'owner' || membership[0].role === 'collaborator'));
      if (!canEdit) {
        return res.status(403).json({ message: 'Not authorized to edit this place' });
      }

      const { title, description, address, visibility, imageUrl, lat, lng } = req.body || {};
      const vis = visibility === 'public' || visibility === 'unlisted' || visibility === 'draft' ? visibility : undefined;
      const newImageUrl = imageUrl !== undefined ? (typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null) : undefined;
      const latNum = lat !== undefined ? (typeof lat === 'number' && !Number.isNaN(lat) ? lat : (typeof lat === 'string' && lat ? parseFloat(lat) : null)) : undefined;
      const lngNum = lng !== undefined ? (typeof lng === 'number' && !Number.isNaN(lng) ? lng : (typeof lng === 'string' && lng ? parseFloat(lng) : null)) : undefined;

      try {
        const existing = await sql`SELECT title, description, address, visibility, "imageUrl", lat, lng FROM places WHERE id = ${id}`;
        if (existing.length === 0) return res.status(404).json({ message: 'Place not found' });
        const cur = existing[0];
        const newTitle = typeof title === 'string' ? title : cur.title;
        const newDesc = description !== undefined ? (description || null) : cur.description;
        const newAddr = address !== undefined ? (address || null) : cur.address;
        const newVis = vis !== undefined ? vis : cur.visibility;
        const finalImageUrl = newImageUrl !== undefined ? newImageUrl : cur.imageUrl;
        const finalLat = latNum !== undefined ? latNum : cur.lat;
        const finalLng = lngNum !== undefined ? lngNum : cur.lng;

        const result = await sql`
          UPDATE places
          SET title = ${newTitle}, description = ${newDesc}, address = ${newAddr}, visibility = ${newVis}, "imageUrl" = ${finalImageUrl}, lat = ${finalLat}, lng = ${finalLng}
          WHERE id = ${id}
          RETURNING *
        `;
        return res.json({ place: result[0] });
      } catch (err) {
        console.error('Update place error:', err);
        return res.status(500).json({ message: 'Failed to update place' });
      }
    }

    // DELETE /api/places?id=xxx (delete place)
    if (req.method === 'DELETE') {
      const user = await requireAuth(req, res);
      if (!user) return;

      const exists = await sql`SELECT id FROM places WHERE id = ${id}`;
      if (exists.length === 0) return res.status(404).json({ message: 'Place not found' });

      const membership = await sql`
        SELECT role FROM object_memberships
        WHERE "objectType" = 'place' AND "objectId" = ${id} AND "userId" = ${user.id}
      `;
      const canDelete = isAdmin(user) || (membership.length > 0 && (membership[0].role === 'owner' || membership[0].role === 'collaborator'));
      if (!canDelete) return res.status(403).json({ message: 'Not authorized to delete this place' });

      try {
        await sql`DELETE FROM object_memberships WHERE "objectType" = 'place' AND "objectId" = ${id}`;
        await sql`UPDATE events SET "placeId" = NULL WHERE "placeId" = ${id}`;
        await sql`DELETE FROM community_link_requests WHERE "objectType" = 'place' AND "objectId" = ${id}`;
        await sql`DELETE FROM places WHERE id = ${id}`;
        return res.status(204).send();
      } catch (err) {
        console.error('Delete place error:', err);
        return res.status(500).json({ message: 'Failed to delete place' });
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  }

  // === LIST ROUTES (when no id is provided) ===

  // Handle GET /api/places?communityId=xxx (places in a community - for community detail page)
  const communityId = typeof req.query.communityId === 'string' ? req.query.communityId : null;
  if (req.method === 'GET' && communityId) {
    try {
      // Public lists can be cached briefly on the CDN
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180');
      const rows = await sql`
        SELECT p.id, p.title, p.description, p.address, p.lat, p.lng, p.visibility, p."imageUrl", p."communityId", p."createdBy", p."createdAt",
          u."fullName" AS "creatorName"
        FROM places p
        LEFT JOIN users u ON u.id = p."createdBy"
        WHERE p."communityId" = ${communityId} AND p.visibility = 'public'
        ORDER BY p."createdAt" DESC
        LIMIT 50
      `;
      const places = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        address: r.address,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        visibility: r.visibility,
        imageUrl: r.imageUrl || null,
        createdBy: r.createdBy,
        creatorName: r.creatorName || null,
        createdAt: r.createdAt,
      }));
      return res.json({ places });
    } catch (err) {
      console.error('Get places by community error:', err);
      return res.status(500).json({ message: 'Failed to fetch places' });
    }
  }

  // Handle GET /api/places?scope=my-communities (places in communities user belongs to)
  if (req.method === 'GET' && req.query.scope === 'my-communities') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const rows = await sql`
        SELECT p.id, p.title, p.description, p.address, p.lat, p.lng, p.visibility, p."imageUrl", p."communityId", p."createdBy", p."createdAt",
          u."fullName" AS "creatorName", c.name AS "communityName", c.slug AS "communitySlug"
        FROM places p
        INNER JOIN object_memberships om ON om."objectType" = 'community' AND om."objectId" = p."communityId" AND om."userId" = ${user.id}
        LEFT JOIN users u ON u.id = p."createdBy"
        LEFT JOIN communities c ON c.id = p."communityId"
        WHERE p."communityId" IS NOT NULL AND p.visibility IN ('public', 'unlisted')
        ORDER BY c.name, p."createdAt" DESC
        LIMIT 100
      `;
      const places = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        address: r.address,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        visibility: r.visibility,
        imageUrl: r.imageUrl || null,
        communityId: r.communityId,
        communityName: r.communityName ?? null,
        communitySlug: r.communitySlug ?? null,
        createdBy: r.createdBy,
        creatorName: r.creatorName || null,
        createdAt: r.createdAt,
      }));
      return res.json({ places });
    } catch (err) {
      console.error('Get places in my communities error:', err);
      return res.status(500).json({ message: 'Failed to fetch places' });
    }
  }

  // Handle GET /api/places?mine=true (user's places)
  if (req.method === 'GET' && req.query.mine === 'true') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const rows = await sql`
        SELECT p.*, om.role
        FROM places p
        INNER JOIN object_memberships om ON om."objectType" = 'place' AND om."objectId" = p.id AND om."userId" = ${user.id}
        WHERE om.role IN ('owner', 'collaborator')
        ORDER BY p."createdAt" DESC
      `;

      const places = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        address: r.address,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        visibility: r.visibility,
        imageUrl: r.imageUrl || null,
        createdBy: r.createdBy,
        createdAt: r.createdAt,
        role: r.role,
        eventCount: 0,
      }));

      return res.json({ places });
    } catch (err) {
      console.error('Get my places error:', err);
      return res.status(500).json({ message: 'Failed to fetch places' });
    }
  }

  // Handle GET /api/places (public list - for Explore / Communities)
  if (req.method === 'GET') {
    try {
      // Public list responses can be cached by CDN
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180');
      const rows = await sql`
        SELECT p.id, p.title, p.description, p.address, p.lat, p.lng, p.visibility, p."imageUrl", p."communityId", p."createdBy", p."createdAt",
          u."fullName" AS "creatorName"
        FROM places p
        LEFT JOIN users u ON u.id = p."createdBy"
        WHERE p.visibility = 'public'
        ORDER BY p."createdAt" DESC
        LIMIT 50
      `;
      const places = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        address: r.address,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        visibility: r.visibility,
        imageUrl: r.imageUrl || null,
        createdBy: r.createdBy,
        creatorName: r.creatorName || null,
        createdAt: r.createdAt,
      }));
      return res.json({ places });
    } catch (err) {
      console.error('Get public places error:', err);
      return res.status(500).json({ message: 'Failed to fetch places' });
    }
  }

  // Handle POST /api/places (create)
  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const { title, description, address, communityId, visibility, imageUrl, lat, lng } = req.body || {};
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: 'title is required' });
      }

      const id = crypto.randomUUID();
      const vis = visibility === 'public' || visibility === 'unlisted' ? visibility : 'draft';
      const imgUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
      const latNum = typeof lat === 'number' && !Number.isNaN(lat) ? lat : (typeof lat === 'string' && lat ? parseFloat(lat) : null);
      const lngNum = typeof lng === 'number' && !Number.isNaN(lng) ? lng : (typeof lng === 'string' && lng ? parseFloat(lng) : null);

      await sql`
        INSERT INTO places (id, title, description, address, "communityId", visibility, "imageUrl", lat, lng, "createdBy")
        VALUES (${id}, ${title}, ${description || null}, ${address || null}, ${communityId || null}, ${vis}, ${imgUrl}, ${latNum}, ${lngNum}, ${user.id})
      `;

      await sql`
        INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
        VALUES (${crypto.randomUUID()}, 'place', ${id}, ${user.id}, 'owner')
      `;

      const rows = await sql`SELECT * FROM places WHERE id = ${id}`;
      return res.status(201).json({ place: rows[0] });
    } catch (err) {
      console.error('Create place error:', err);
      return res.status(500).json({ message: 'Failed to create place' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
