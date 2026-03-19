import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { requireAuth } from '../../server-lib/requireAuth.js';
import { verifyToken } from '../../server-lib/auth.js';
import { isAdmin } from '../../server-lib/admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();

  // Handle GET /api/events?id=xxx (single event by ID)
  if (req.method === 'GET' && req.query.id && req.query.mine !== 'true') {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ message: 'Event ID required' });
    }

    try {
      const rows = await sql`
        SELECT 
          e.*,
          p.title AS "placeTitle",
          p.address AS "placeAddress",
          c.name AS "communityName",
          c.slug AS "communitySlug",
          u."fullName" AS "creatorName",
          u.email AS "creatorEmail"
        FROM events e
        LEFT JOIN places p ON p.id = e."placeId"
        LEFT JOIN communities c ON c.id = e."communityId"
        LEFT JOIN users u ON u.id = e."createdBy"
        WHERE e.id = ${id}
      `;

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const event = rows[0];

      // For public events, allow viewing without auth
      // For unlisted/draft, require auth and check membership
      if (event.visibility !== 'public') {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.slice(7);
            const { userId } = verifyToken(token);
            
            // Check if user is owner/collaborator or has booking
            const membership = await sql`
              SELECT role FROM object_memberships
              WHERE "objectType" = 'event' AND "objectId" = ${id} AND "userId" = ${userId}
            `;
            
            const booking = await sql`
              SELECT id FROM bookings
              WHERE "listingType" = 'event' AND "listingId" = ${id} AND "userId" = ${userId}
              LIMIT 1
            `;

            if (membership.length === 0 && booking.length === 0) {
              return res.status(403).json({ message: 'Event not accessible' });
            }
          } catch {
            if (event.visibility === 'draft') {
              return res.status(403).json({ message: 'Event not accessible' });
            }
          }
        } else if (event.visibility === 'draft') {
          return res.status(403).json({ message: 'Event not accessible' });
        }
      }

      // If this is a public event, allow short CDN caching
      if (event.visibility === 'public') {
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180');
      }

      // Get attendees count from bookings
      const bookingCount = await sql`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE "listingType" = 'event' AND "listingId" = ${id} AND status IN ('pending', 'confirmed')
      `;
      const attendees = Number(bookingCount[0]?.count || 0);

      // If event has a community and user is authenticated and in that community, include attendee list (only community members)
      let attendeesList: { userId: string; fullName: string; avatarUrl: string | null }[] = [];
      const communityId = event.communityId as string | null;
      if (communityId) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.slice(7);
            const { userId } = verifyToken(token);
            const viewerInCommunity = await sql`
              SELECT 1 FROM object_memberships
              WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${userId}
              LIMIT 1
            `;
            if (viewerInCommunity.length > 0) {
              const attendeeRows = await sql`
                SELECT b."userId", u."fullName", u."avatarUrl"
                FROM bookings b
                INNER JOIN users u ON u.id = b."userId"
                INNER JOIN object_memberships om ON om."objectType" = 'community' AND om."objectId" = ${communityId} AND om."userId" = b."userId"
                WHERE b."listingType" = 'event' AND b."listingId" = ${id} AND b.status IN ('pending', 'confirmed')
                ORDER BY u."fullName"
              `;
              attendeesList = attendeeRows.map((r) => ({
                userId: r.userId,
                fullName: r.fullName || 'Unknown',
                avatarUrl: r.avatarUrl ?? null,
              }));
            }
          } catch {
            // Token invalid — no attendees list
          }
        }
      }

      // Get collaborators
      const collabRows = await sql`
        SELECT om."userId", om.role, u."fullName", u.email
        FROM object_memberships om
        INNER JOIN users u ON u.id = om."userId"
        WHERE om."objectType" = 'event' AND om."objectId" = ${id}
        ORDER BY 
          CASE om.role 
            WHEN 'owner' THEN 1 
            WHEN 'collaborator' THEN 2 
            ELSE 3 
          END,
          u."fullName"
      `;

      return res.json({
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          imageUrl: event.imageUrl ?? null,
          placeId: event.placeId,
          placeTitle: event.placeTitle,
          placeAddress: event.placeAddress,
          communityId: event.communityId,
          communityName: event.communityName,
          communitySlug: event.communitySlug,
          startAt: event.startAt,
          endAt: event.endAt,
          capacity: event.capacity,
          visibility: event.visibility,
          createdBy: event.createdBy,
          creatorName: event.creatorName,
          creatorEmail: event.creatorEmail,
          createdAt: event.createdAt,
          attendees,
          attendeesList: attendeesList.length > 0 ? attendeesList : undefined,
          collaborators: collabRows.map((r) => ({
            userId: r.userId,
            role: r.role,
            fullName: r.fullName,
            email: r.email,
          })),
        },
      });
    } catch (err) {
      console.error('Get event error:', err);
      return res.status(500).json({ message: 'Failed to fetch event' });
    }
  }

  // Handle GET /api/events?mine=true (user's events)
  if (req.method === 'GET' && req.query.mine === 'true') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      // Events where user is owner or collaborator (via object_memberships)
      const membershipRows = await sql`
        SELECT e.*, p.title AS "placeTitle", p.address AS "placeAddress", c.name AS "communityName", c.slug AS "communitySlug", om.role
        FROM events e
        INNER JOIN object_memberships om ON om."objectType" = 'event' AND om."objectId" = e.id AND om."userId" = ${user.id}
        LEFT JOIN places p ON p.id = e."placeId"
        LEFT JOIN communities c ON c.id = e."communityId"
        WHERE om.role IN ('owner', 'collaborator')
      `;

      // Events where user is attending (via bookings)
      const bookingRows = await sql`
        SELECT DISTINCT e.*, p.title AS "placeTitle", p.address AS "placeAddress", c.name AS "communityName", c.slug AS "communitySlug", 'attendee' AS role
        FROM events e
        INNER JOIN bookings b ON b."listingType" = 'event' AND b."listingId" = e.id AND b."userId" = ${user.id}
        LEFT JOIN places p ON p.id = e."placeId"
        LEFT JOIN communities c ON c.id = e."communityId"
        WHERE b.status IN ('pending', 'confirmed')
        AND NOT EXISTS (
          SELECT 1 FROM object_memberships om2
          WHERE om2."objectType" = 'event' AND om2."objectId" = e.id AND om2."userId" = ${user.id}
        )
      `;

      const allEvents = [...membershipRows, ...bookingRows].map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrl: r.imageUrl ?? null,
        placeId: r.placeId,
        placeTitle: r.placeTitle ?? null,
        placeAddress: r.placeAddress ?? null,
        communityId: r.communityId ?? null,
        communityName: r.communityName ?? null,
        communitySlug: r.communitySlug ?? null,
        startAt: r.startAt,
        endAt: r.endAt,
        capacity: r.capacity,
        visibility: r.visibility,
        createdBy: r.createdBy,
        createdAt: r.createdAt,
        role: r.role,
      }));

      // Sort by start date
      allEvents.sort((a, b) => {
        const aDate = a.startAt ? new Date(a.startAt).getTime() : 0;
        const bDate = b.startAt ? new Date(b.startAt).getTime() : 0;
        return aDate - bDate;
      });

      return res.json({ events: allEvents });
    } catch (err) {
      console.error('Get my events error:', err);
      return res.status(500).json({ message: 'Failed to fetch events' });
    }
  }

  // Handle GET /api/events?communityId=xxx (events in a community)
  const eventCommunityId = typeof req.query.communityId === 'string' ? req.query.communityId : null;
  if (req.method === 'GET' && eventCommunityId) {
    try {
      // Public community event lists can be cached briefly at the CDN
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180');
      const rows = await sql`
        SELECT e.id, e.title, e.description, e."imageUrl", e."placeId", e."communityId", e."startAt", e."endAt", e.capacity, e.visibility, e."createdBy", e."createdAt",
          p.title AS "placeTitle", p.address AS "placeAddress",
          c.name AS "communityName", c.slug AS "communitySlug",
          u."fullName" AS "creatorName"
        FROM events e
        LEFT JOIN places p ON p.id = e."placeId"
        LEFT JOIN communities c ON c.id = e."communityId"
        LEFT JOIN users u ON u.id = e."createdBy"
        WHERE e."communityId" = ${eventCommunityId} AND e.visibility = 'public'
        ORDER BY e."startAt" ASC
        LIMIT 50
      `;
      const events = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrl: r.imageUrl ?? null,
        placeId: r.placeId,
        placeTitle: r.placeTitle ?? null,
        placeAddress: r.placeAddress ?? null,
        communityId: r.communityId ?? null,
        communityName: r.communityName ?? null,
        communitySlug: r.communitySlug ?? null,
        startAt: r.startAt,
        endAt: r.endAt,
        capacity: r.capacity,
        visibility: r.visibility,
        createdBy: r.createdBy,
        creatorName: r.creatorName || null,
        createdAt: r.createdAt,
      }));
      return res.json({ events });
    } catch (err) {
      console.error('Get events by community error:', err);
      return res.status(500).json({ message: 'Failed to fetch events' });
    }
  }

  // Handle GET /api/events?tenant=:slug (tenant-scoped public event list — booking page)
  const tenantSlug = typeof req.query.tenant === 'string' ? req.query.tenant : null;
  if (req.method === 'GET' && tenantSlug) {
    try {
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180');

      // Resolve tenant — fail loudly if not found (don't leak other tenants' data)
      const tenantRows = await sql`SELECT id FROM tenants WHERE slug = ${tenantSlug} LIMIT 1`;
      if (tenantRows.length === 0) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      const tenantId = (tenantRows[0] as { id: string }).id;

      const rows = await sql`
        SELECT
          e.id, e.title, e.description, e."imageUrl",
          e."startAt", e."endAt", e.capacity,
          e.price, e.pricing_type, e.modality,
          e.discoverable, e.visibility, e."createdAt",
          v.name AS venue_name, v.suburb, v.city,
          COALESCE(cnt.c, 0)::int AS booked_count
        FROM events e
        LEFT JOIN venues v ON v.id = e.venue_id
        LEFT JOIN (
          SELECT "listingId", COUNT(*)::int AS c
          FROM bookings
          WHERE "listingType" = 'event' AND status IN ('pending', 'confirmed')
          GROUP BY "listingId"
        ) cnt ON cnt."listingId" = e.id
        WHERE e.tenant_id = ${tenantId}
          AND e.visibility = 'public'
          AND e."startAt" > NOW()
        ORDER BY e."startAt" ASC
        LIMIT 50
      `;

      const events = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? null,
        imageUrl: r.imageUrl ?? null,
        startAt: r.startAt,
        endAt: r.endAt ?? null,
        capacity: r.capacity ?? null,
        bookedCount: r.booked_count,
        price: r.price ?? 0,
        pricingType: r.pricing_type ?? 'free',
        modality: r.modality ?? 'in_person',
        discoverable: r.discoverable ?? false,
        venue: r.venue_name
          ? { name: r.venue_name, suburb: r.suburb ?? null, city: r.city ?? null }
          : null,
      }));

      return res.json({ events });
    } catch (err) {
      console.error('Get tenant events error:', err);
      return res.status(500).json({ message: 'Failed to fetch events' });
    }
  }

  // Handle GET /api/events (public list - for Explore / Communities)
  if (req.method === 'GET') {
    try {
      // Public list responses can be cached at the CDN for short periods
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180');
      const rows = await sql`
        SELECT e.id, e.title, e.description, e."imageUrl", e."placeId", e."communityId", e."startAt", e."endAt", e.capacity, e.visibility, e."createdBy", e."createdAt",
          p.title AS "placeTitle", p.address AS "placeAddress",
          c.name AS "communityName", c.slug AS "communitySlug",
          u."fullName" AS "creatorName"
        FROM events e
        LEFT JOIN places p ON p.id = e."placeId"
        LEFT JOIN communities c ON c.id = e."communityId"
        LEFT JOIN users u ON u.id = e."createdBy"
        WHERE e.visibility = 'public'
        ORDER BY e."startAt" ASC
        LIMIT 50
      `;
      const events = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrl: r.imageUrl ?? null,
        placeId: r.placeId,
        placeTitle: r.placeTitle,
        placeAddress: r.placeAddress,
        communityId: r.communityId,
        communityName: r.communityName || null,
        communitySlug: r.communitySlug || null,
        startAt: r.startAt,
        endAt: r.endAt,
        capacity: r.capacity,
        visibility: r.visibility,
        createdBy: r.createdBy,
        creatorName: r.creatorName || null,
        createdAt: r.createdAt,
      }));
      return res.json({ events });
    } catch (err) {
      console.error('Get public events error:', err);
      return res.status(500).json({ message: 'Failed to fetch events' });
    }
  }

  // PATCH /api/events?id=xxx - update event (owner/collaborator or admin)
  const patchEventId = req.method === 'PATCH' && typeof req.query.id === 'string' ? req.query.id : null;
  if (patchEventId) {
    const user = await requireAuth(req, res);
    if (!user) return;
    try {
      const existing = await sql`SELECT id, title, description, "imageUrl", "placeId", "communityId", "startAt", "endAt", capacity, visibility FROM events WHERE id = ${patchEventId}`;
      if (existing.length === 0) return res.status(404).json({ message: 'Event not found' });
      const membership = await sql`
        SELECT role FROM object_memberships
        WHERE "objectType" = 'event' AND "objectId" = ${patchEventId} AND "userId" = ${user.id}
      `;
      const canEdit = isAdmin(user) || (membership.length > 0 && (membership[0].role === 'owner' || membership[0].role === 'collaborator'));
      if (!canEdit) return res.status(403).json({ message: 'Not authorized to edit this event' });

      const { title, description, imageUrl, placeId, communityId, startAt, endAt, capacity, visibility } = req.body || {};
      const cur = existing[0];
      const newTitle = typeof title === 'string' && title.trim() ? title.trim() : cur.title;
      const newDesc = description !== undefined ? (description || null) : cur.description;
      const newImageUrl = imageUrl !== undefined ? (typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null) : cur.imageUrl;
      const newPlaceId = placeId !== undefined ? (placeId || null) : cur.placeId;
      const newCommunityId = communityId !== undefined ? (communityId || null) : cur.communityId;
      const newStartAt = startAt !== undefined ? startAt : cur.startAt;
      const newEndAt = endAt !== undefined ? (endAt || null) : cur.endAt;
      const newCapacity = capacity !== undefined ? (capacity != null ? Number(capacity) : null) : cur.capacity;
      const newVis = visibility === 'public' || visibility === 'unlisted' || visibility === 'draft' ? visibility : cur.visibility;

      const result = await sql`
        UPDATE events
        SET title = ${newTitle}, description = ${newDesc}, "imageUrl" = ${newImageUrl}, "placeId" = ${newPlaceId}, "communityId" = ${newCommunityId},
            "startAt" = ${newStartAt}, "endAt" = ${newEndAt}, capacity = ${newCapacity}, visibility = ${newVis}
        WHERE id = ${patchEventId}
        RETURNING *
      `;
      return res.json({ event: result[0] });
    } catch (err) {
      console.error('Update event error:', err);
      return res.status(500).json({ message: 'Failed to update event' });
    }
  }

  // DELETE /api/events?id=xxx (owner/collaborator or admin)
  const deleteEventId = req.method === 'DELETE' && typeof req.query.id === 'string' ? req.query.id : null;
  if (deleteEventId) {
    const user = await requireAuth(req, res);
    if (!user) return;
    try {
      const exists = await sql`SELECT id FROM events WHERE id = ${deleteEventId}`;
      if (exists.length === 0) return res.status(404).json({ message: 'Event not found' });
      const membership = await sql`
        SELECT role FROM object_memberships
        WHERE "objectType" = 'event' AND "objectId" = ${deleteEventId} AND "userId" = ${user.id}
      `;
      const canDelete = isAdmin(user) || (membership.length > 0 && (membership[0].role === 'owner' || membership[0].role === 'collaborator'));
      if (!canDelete) return res.status(403).json({ message: 'Not authorized to delete this event' });

      await sql`DELETE FROM bookings WHERE "listingType" = 'event' AND "listingId" = ${deleteEventId}`;
      await sql`DELETE FROM object_memberships WHERE "objectType" = 'event' AND "objectId" = ${deleteEventId}`;
      await sql`DELETE FROM community_link_requests WHERE "objectType" = 'event' AND "objectId" = ${deleteEventId}`;
      await sql`DELETE FROM events WHERE id = ${deleteEventId}`;
      return res.status(204).send();
    } catch (err) {
      console.error('Delete event error:', err);
      return res.status(500).json({ message: 'Failed to delete event' });
    }
  }

  // Handle POST /api/events (create)
  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const { title, description, imageUrl, placeId, communityId, startAt, endAt, capacity, visibility } = req.body || {};
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: 'title is required' });
      }
      if (!startAt) {
        return res.status(400).json({ message: 'startAt is required' });
      }

      const id = crypto.randomUUID();
      const vis = visibility === 'public' || visibility === 'unlisted' ? visibility : 'draft';
      const imgUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;

      await sql`
        INSERT INTO events (id, title, description, "imageUrl", "placeId", "communityId", "startAt", "endAt", capacity, visibility, "createdBy")
        VALUES (${id}, ${title}, ${description || null}, ${imgUrl}, ${placeId || null}, ${communityId || null}, ${startAt}, ${endAt || null}, ${capacity || null}, ${vis}, ${user.id})
      `;

      await sql`
        INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
        VALUES (${crypto.randomUUID()}, 'event', ${id}, ${user.id}, 'owner')
      `;

      const rows = await sql`SELECT * FROM events WHERE id = ${id}`;
      return res.status(201).json({ event: rows[0] });
    } catch (err) {
      console.error('Create event error:', err);
      return res.status(500).json({ message: 'Failed to create event' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
