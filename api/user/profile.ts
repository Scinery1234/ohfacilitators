import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../server-lib/db.js';
import { requireAuth } from '../../server-lib/requireAuth.js';
import { isAdmin } from '../../server-lib/admin.js';

function userToResponse(row: Record<string, unknown>) {
  const user = {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: (row.role as string) || 'user',
    trustTier: (row.trust_tier as string) || 'unverified',
    avatarUrl: (row.avatarUrl as string) ?? null,
    bio: (row.bio as string) ?? null,
    locationArea: (row.locationArea as string) ?? null,
  };
  return { ...user, isAdmin: isAdmin(user) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  await initDb();

  // PATCH /api/user/profile - update profile (fullName, avatarUrl, bio, locationArea)
  if (req.method === 'PATCH') {
    try {
      const { fullName, avatarUrl, bio, locationArea } = req.body || {};
      const current = await sql`SELECT "fullName", "avatarUrl", bio, "locationArea" FROM users WHERE id = ${user.id}`;
      if (current.length === 0) return res.status(404).json({ message: 'User not found' });
      const c = current[0] as Record<string, string | null>;

      const newFullName = fullName !== undefined ? (typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null) : c.fullName;
      const newAvatarUrl = avatarUrl !== undefined ? (typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null) : c.avatarUrl;
      const newBio = bio !== undefined ? (typeof bio === 'string' && bio.trim() ? bio.trim() : null) : c.bio;
      const newLocationArea = locationArea !== undefined ? (typeof locationArea === 'string' && locationArea.trim() ? locationArea.trim() : null) : c.locationArea;

      const changed = newFullName !== c.fullName || newAvatarUrl !== c.avatarUrl || newBio !== c.bio || newLocationArea !== c.locationArea;
      if (!changed) return res.status(400).json({ message: 'No valid fields to update' });

      const result = await sql`
        UPDATE users SET "fullName" = ${newFullName}, "avatarUrl" = ${newAvatarUrl}, bio = ${newBio}, "locationArea" = ${newLocationArea}
        WHERE id = ${user.id}
        RETURNING id, email, "fullName", role, trust_tier, "avatarUrl", bio, "locationArea"
      `;

      if (result.length === 0) return res.status(404).json({ message: 'User not found' });
      return res.json({ user: userToResponse(result[0]) });
    } catch (err) {
      console.error('Update profile error:', err);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const userId = user.id;

    // Determine what data to return based on query params
    const includeProfile = !req.query.counts && !req.query.schedule; // Default to profile
    const includeCounts = req.query.counts === 'true';
    const includeSchedule = req.query.schedule === 'true';
    const includeAll = req.query.all === 'true';

    const response: any = {};

    // Get profile (if requested or default)
    if (includeProfile || includeAll) {
      const rows = await sql`SELECT id, email, "fullName", role, trust_tier, "avatarUrl", bio, "locationArea" FROM users WHERE id = ${userId}`;
      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      response.user = userToResponse(rows[0]);
    }

    // Get counts (if requested or with all)
    if (includeCounts || includeAll) {
      const [placesCount] = await sql`
        SELECT COUNT(*)::int AS c FROM places p
        INNER JOIN object_memberships om ON om."objectType" = 'place' AND om."objectId" = p.id AND om."userId" = ${userId}
        WHERE om.role IN ('owner', 'collaborator')
      `;
      const [eventsCount] = await sql`
        SELECT COUNT(*)::int AS c FROM events e
        INNER JOIN object_memberships om ON om."objectType" = 'event' AND om."objectId" = e.id AND om."userId" = ${userId}
        WHERE om.role IN ('owner', 'collaborator')
      `;
      const [eventRows] = await sql`
        SELECT COUNT(*)::int AS c FROM events e
        INNER JOIN object_memberships om ON om."objectType" = 'event' AND om."objectId" = e.id AND om."userId" = ${userId}
        WHERE e."startAt" >= NOW()
      `;
      const [bookingRows] = await sql`
        SELECT COUNT(*)::int AS c FROM bookings b
        WHERE b."userId" = ${userId} AND b.status IN ('pending', 'confirmed') AND b."startAt" >= NOW()
      `;
      const scheduleCount = {
        c: ((eventRows as { c: number })?.c ?? 0) + ((bookingRows as { c: number })?.c ?? 0),
      };

      // Unread messages count (for nav badge)
      let messagesUnread = 0;
      try {
        const convRows = await sql`
          SELECT "conversationId", "lastReadAt" FROM conversation_participants WHERE "userId" = ${userId}
        `;
        for (const row of convRows) {
          const cid = (row as { conversationId: string }).conversationId;
          const lastRead = (row as { lastReadAt: string | null }).lastReadAt;
          const res = lastRead
            ? await sql`SELECT COUNT(*)::int AS c FROM messages WHERE "conversationId" = ${cid} AND "senderId" != ${userId} AND "createdAt" > ${lastRead}`
            : await sql`SELECT COUNT(*)::int AS c FROM messages WHERE "conversationId" = ${cid} AND "senderId" != ${userId}`;
          messagesUnread += Number((res[0] as { c: number })?.c ?? 0);
        }
      } catch {
        // tables may not exist yet
      }

      response.counts = {
        communities: 0,
        places: (placesCount as { c: number })?.c ?? 0,
        events: (eventsCount as { c: number })?.c ?? 0,
        schedule: (scheduleCount as { c: number })?.c ?? 0,
        messagesUnread,
      };
    }

    // Get schedule (if requested or with all)
    if (includeSchedule || includeAll) {
      const eventRows = await sql`
        SELECT e.*, p.title AS "placeTitle", om.role
        FROM events e
        INNER JOIN object_memberships om ON om."objectType" = 'event' AND om."objectId" = e.id AND om."userId" = ${userId}
        LEFT JOIN places p ON p.id = e."placeId"
        WHERE e."startAt" >= NOW()
        ORDER BY e."startAt" ASC
      `;

      const scheduleItems = eventRows.map((r) => ({
        id: r.id,
        type: 'event',
        title: r.title,
        startAt: r.startAt,
        endAt: r.endAt,
        placeTitle: r.placeTitle,
        role: r.role === 'owner' ? 'Host' : r.role === 'collaborator' ? 'Facilitator' : 'Attending',
        status: r.visibility === 'public' ? 'Published' : r.visibility === 'unlisted' ? 'Unlisted' : 'Draft',
      }));

      const bookingRows = await sql`
        SELECT b.id, b."listingId", b."listingType", b."startAt", b."endAt", b.status
        FROM bookings b
        WHERE b."userId" = ${userId}
        AND b.status IN ('pending', 'confirmed')
        AND b."startAt" >= NOW()
      `;

      for (const b of bookingRows) {
        let title = 'Booking';
        if (b.listingType === 'event' && b.listingId) {
          const ev = await sql`SELECT title FROM events WHERE id = ${b.listingId}`;
          if (ev.length) title = (ev[0] as { title: string }).title;
        }
        scheduleItems.push({
          id: b.id,
          type: 'booking',
          title,
          startAt: b.startAt,
          endAt: b.endAt,
          role: 'Attending',
          status: b.status,
        });
      }

      scheduleItems.sort((a, b) => new Date(a.startAt || 0).getTime() - new Date(b.startAt || 0).getTime());
      response.schedule = scheduleItems;
    }

    return res.json(response);
  } catch (err) {
    console.error('Get user profile error:', err);
    return res.status(500).json({ message: 'Failed to fetch user profile' });
  }
}
