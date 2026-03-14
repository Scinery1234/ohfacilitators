import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { requireAuth } from '../../server-lib/requireAuth.js';
import { isAdmin } from '../../server-lib/admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();

  // Handle GET /api/communities?slug=xxx (single community by slug - for detail page)
  // ?include=places,events returns community + places + events in one call (eliminates waterfall)
  const slug = typeof req.query.slug === 'string' ? req.query.slug : null;
  const include = typeof req.query.include === 'string' ? req.query.include : '';
  const includePlaces = include.includes('places');
  const includeEvents = include.includes('events');

  if (req.method === 'GET' && slug) {
    try {
      // Try slug first; if not found and param looks like UUID, try id (handles communities with null slug)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      let rows = await sql`
        SELECT c.id, c.name, c.slug, c.description, c.visibility, c."locationArea", c.type, c."imageUrl", c."codeOfConduct", c.tags, c."joinApproval", c."createdBy", c."createdAt", u."fullName"
        FROM communities c
        LEFT JOIN users u ON u.id = c."createdBy"
        WHERE c.slug = ${slug}
      `;
      if (rows.length === 0 && isUuid) {
        rows = await sql`
          SELECT c.id, c.name, c.slug, c.description, c.visibility, c."locationArea", c.type, c."imageUrl", c."codeOfConduct", c.tags, c."joinApproval", c."createdBy", c."createdAt", u."fullName"
          FROM communities c
          LEFT JOIN users u ON u.id = c."createdBy"
          WHERE c.id = ${slug}
        `;
      }
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Community not found' });
      }
      const community = rows[0];
      let userRole: string | null = null;
      if (community.visibility === 'draft') {
        const user = await requireAuth(req, res);
        if (!user) return;
        const member = await sql`
          SELECT role FROM object_memberships
          WHERE "objectType" = 'community' AND "objectId" = ${community.id} AND "userId" = ${user.id}
        `;
        if (member.length === 0) return res.status(404).json({ message: 'Community not found' });
        userRole = member[0].role;
      } else {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const { verifyToken } = await import('../../server-lib/auth.js');
            const { userId } = verifyToken(authHeader.slice(7));
            const member = await sql`
              SELECT role FROM object_memberships
              WHERE "objectType" = 'community' AND "objectId" = ${community.id} AND "userId" = ${userId}
            `;
            if (member.length > 0) userRole = member[0].role;
            const u = await sql`SELECT id, email, role FROM users WHERE id = ${userId}`;
            if (u.length > 0 && isAdmin(u[0])) userRole = 'owner';
          } catch {
            // ignore
          }
        }
      }
      const communityPayload = {
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        visibility: community.visibility,
        locationArea: community.locationArea ?? null,
        type: community.type ?? 'open',
        imageUrl: community.imageUrl ?? null,
        codeOfConduct: community.codeOfConduct ?? null,
        tags: Array.isArray(community.tags) ? community.tags : (community.tags ? JSON.parse(String(community.tags)) : []),
        joinApproval: community.joinApproval ?? 'auto',
        createdBy: community.createdBy,
        creatorName: community.fullName || null,
        createdAt: community.createdAt,
        role: userRole,
      };

      if (!includePlaces && !includeEvents) {
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
        return res.json({ community: communityPayload });
      }

      const communityId = community.id;
      const [placesRows, eventsRows] = await Promise.all([
        includePlaces
          ? sql`
              SELECT p.id, p.title, p.description, p.address, p.lat, p.lng, p."imageUrl", p."createdBy", u."fullName" AS "creatorName"
              FROM places p
              LEFT JOIN users u ON u.id = p."createdBy"
              WHERE p."communityId" = ${communityId} AND p.visibility = 'public'
              ORDER BY p."createdAt" DESC
            `
          : Promise.resolve([]),
        includeEvents
          ? sql`
              SELECT e.id, e.title, e.description, e."imageUrl", e."startAt", e."placeId", e."communityId", e."createdBy", u."fullName" AS "creatorName", p.title AS "placeTitle", p.address AS "placeAddress"
              FROM events e
              LEFT JOIN users u ON u.id = e."createdBy"
              LEFT JOIN places p ON p.id = e."placeId"
              WHERE e."communityId" = ${communityId} AND e.visibility = 'public'
              ORDER BY e."startAt" ASC
            `
          : Promise.resolve([]),
      ]);

      const places = (includePlaces ? placesRows : []).map((r: Record<string, unknown>) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        address: r.address,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        imageUrl: r.imageUrl ?? null,
        createdBy: r.createdBy,
        creatorName: r.creatorName ?? null,
      }));
      const events = (includeEvents ? eventsRows : []).map((r: Record<string, unknown>) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrl: r.imageUrl ?? null,
        startAt: r.startAt,
        placeId: r.placeId,
        placeTitle: r.placeTitle ?? null,
        placeAddress: r.placeAddress ?? null,
        communityId: r.communityId ?? null,
        communityName: community.name,
        communitySlug: community.slug,
        createdBy: r.createdBy,
        creatorName: r.creatorName ?? null,
      }));

      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
      return res.json({ community: communityPayload, places, events });
    } catch (err) {
      console.error('Get community by slug error:', err);
      return res.status(500).json({ message: 'Failed to fetch community' });
    }
  }

  // Handle GET /api/communities?mine=true (user's communities)
  if (req.method === 'GET' && req.query.mine === 'true') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const rows = await sql`
        SELECT c.*, om.role
        FROM communities c
        INNER JOIN object_memberships om ON om."objectType" = 'community' AND om."objectId" = c.id AND om."userId" = ${user.id}
        WHERE om.role IN ('owner', 'collaborator')
        ORDER BY c."createdAt" DESC
      `;

      const communities = rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        visibility: r.visibility,
        locationArea: r.locationArea ?? null,
        type: r.type ?? 'open',
        imageUrl: r.imageUrl ?? null,
        codeOfConduct: r.codeOfConduct ?? null,
        tags: Array.isArray(r.tags) ? r.tags : (r.tags ? JSON.parse(String(r.tags)) : []),
        joinApproval: r.joinApproval ?? 'auto',
        createdBy: r.createdBy,
        createdAt: r.createdAt,
        role: r.role,
      }));

      return res.json({ communities });
    } catch (err) {
      console.error('Get my communities error:', err);
      return res.status(500).json({ message: 'Failed to fetch communities' });
    }
  }

  // Handle GET /api/communities (public list - public + unlisted so created communities show)
  if (req.method === 'GET') {
    try {
      // Set caching headers for improved performance
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180');
      
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = 20;
      const offset = (page - 1) * limit;

      const rows = await sql`
        SELECT c.id, c.name, c.slug, c.description, c.visibility, c."locationArea", c.type, c."imageUrl", c.tags, c."joinApproval", c."createdAt"
        FROM communities c
        WHERE c.visibility IN ('public', 'unlisted')
        ORDER BY c."createdAt" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      const totalCount = rows.length > 0 ? 100 : 0; // Approximate count for performance
      
      const communities = rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        visibility: r.visibility,
        locationArea: r.locationArea ?? null,
        type: r.type ?? 'open',
        imageUrl: r.imageUrl ?? null,
        tags: Array.isArray(r.tags) ? r.tags : (r.tags ? JSON.parse(String(r.tags)) : []),
        joinApproval: r.joinApproval ?? 'auto',
        createdAt: r.createdAt,
      }));
      return res.json({ 
        communities, 
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });
    } catch (err) {
      console.error('Get public communities error:', err);
      return res.status(500).json({ message: 'Failed to fetch communities' });
    }
  }

  // Handle POST /api/communities (create)
  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const { name, description, visibility, locationArea, type, imageUrl, codeOfConduct, tags, joinApproval } = req.body || {};
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'name is required' });
      }

      const id = crypto.randomUUID();
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      let finalSlug = slug;
      let counter = 1;
      while (true) {
        const existing = await sql`SELECT id FROM communities WHERE slug = ${finalSlug}`;
        if (existing.length === 0) break;
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      const vis = visibility === 'public' || visibility === 'unlisted' ? visibility : 'draft';
      const communityType = type === 'closed' || type === 'approval' ? type : 'open';
      const locArea = typeof locationArea === 'string' ? locationArea.trim() || null : null;
      const imgUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
      const coc = typeof codeOfConduct === 'string' ? codeOfConduct.trim() || null : null;
      const tagsVal = Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' && tags.trim() ? tags : '[]');
      const joinApp = joinApproval === 'manual' || joinApproval === 'invite_only' ? joinApproval : 'auto';

      await sql`
        INSERT INTO communities (id, name, slug, description, visibility, "locationArea", type, "imageUrl", "codeOfConduct", tags, "joinApproval", "createdBy")
        VALUES (${id}, ${name}, ${finalSlug}, ${description || null}, ${vis}, ${locArea}, ${communityType}, ${imgUrl}, ${coc}, ${tagsVal}::jsonb, ${joinApp}, ${user.id})
      `;

      await sql`
        INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
        VALUES (${crypto.randomUUID()}, 'community', ${id}, ${user.id}, 'owner')
      `;

      const rows = await sql`SELECT * FROM communities WHERE id = ${id}`;
      return res.status(201).json({ community: rows[0] });
    } catch (err) {
      console.error('Create community error:', err);
      return res.status(500).json({ message: 'Failed to create community' });
    }
  }

  // PATCH /api/communities?slug=xxx - update community (owner/collaborator or admin)
  const patchSlug = typeof req.query.slug === 'string' ? req.query.slug : null;
  if (req.method === 'PATCH' && patchSlug) {
    const user = await requireAuth(req, res);
    if (!user) return;
    try {
      const rows = await sql`SELECT id, name, slug, description, visibility, "locationArea", type, "imageUrl", "codeOfConduct", tags, "joinApproval" FROM communities WHERE slug = ${patchSlug}`;
      if (rows.length === 0) return res.status(404).json({ message: 'Community not found' });
      const communityId = rows[0].id;
      const member = await sql`
        SELECT role FROM object_memberships
        WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${user.id}
      `;
      const canEdit = isAdmin(user) || (member.length > 0 && (member[0].role === 'owner' || member[0].role === 'collaborator'));
      if (!canEdit) return res.status(403).json({ message: 'Not authorized to edit this community' });

      const { name, description, visibility, locationArea, type, imageUrl, codeOfConduct, tags, joinApproval } = req.body || {};
      const cur = rows[0] as Record<string, unknown>;
      const newName = typeof name === 'string' && name.trim() ? name.trim() : cur.name;
      const newDesc = description !== undefined ? (description || null) : cur.description;
      const newVis = visibility === 'public' || visibility === 'unlisted' || visibility === 'draft' ? visibility : cur.visibility;
      const newLoc = locationArea !== undefined ? (typeof locationArea === 'string' ? locationArea.trim() || null : null) : cur.locationArea;
      const newType = type === 'closed' || type === 'approval' ? type : (type === 'open' ? 'open' : cur.type);
      const newImg = imageUrl !== undefined ? (typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null) : cur.imageUrl;
      const newCoc = codeOfConduct !== undefined ? (typeof codeOfConduct === 'string' ? codeOfConduct.trim() || null : null) : cur.codeOfConduct;
      const newTags = tags !== undefined ? (Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' && tags.trim() ? tags : '[]')) : JSON.stringify(cur.tags || []);
      const newJoinApp = joinApproval === 'manual' || joinApproval === 'invite_only' ? joinApproval : (joinApproval === 'auto' ? 'auto' : cur.joinApproval);

      const result = await sql`
        UPDATE communities
        SET name = ${newName}, description = ${newDesc}, visibility = ${newVis}, "locationArea" = ${newLoc}, type = ${newType}, "imageUrl" = ${newImg}, "codeOfConduct" = ${newCoc}, tags = ${newTags}::jsonb, "joinApproval" = ${newJoinApp}
        WHERE id = ${communityId}
        RETURNING *
      `;
      return res.json({ community: result[0] });
    } catch (err) {
      console.error('Update community error:', err);
      return res.status(500).json({ message: 'Failed to update community' });
    }
  }

  // DELETE /api/communities?slug=xxx (owner/collaborator or admin)
  const delSlug = typeof req.query.slug === 'string' ? req.query.slug : null;
  if (req.method === 'DELETE' && delSlug) {
    const user = await requireAuth(req, res);
    if (!user) return;
    try {
      const rows = await sql`SELECT id FROM communities WHERE slug = ${delSlug}`;
      if (rows.length === 0) return res.status(404).json({ message: 'Community not found' });
      const communityId = rows[0].id;
      const member = await sql`
        SELECT role FROM object_memberships
        WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${user.id}
      `;
      const canDelete = isAdmin(user) || (member.length > 0 && (member[0].role === 'owner' || member[0].role === 'collaborator'));
      if (!canDelete) return res.status(403).json({ message: 'Not authorized to delete this community' });

      await sql`DELETE FROM community_link_requests WHERE "communityId" = ${communityId}`;
      await sql`DELETE FROM object_memberships WHERE "objectType" = 'community' AND "objectId" = ${communityId}`;
      await sql`UPDATE places SET "communityId" = NULL WHERE "communityId" = ${communityId}`;
      await sql`UPDATE events SET "communityId" = NULL WHERE "communityId" = ${communityId}`;
      await sql`DELETE FROM communities WHERE id = ${communityId}`;
      return res.status(204).end();
    } catch (err) {
      console.error('Delete community error:', err);
      return res.status(500).json({ message: 'Failed to delete community' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
