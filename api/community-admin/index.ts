import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { requireAuth } from '../../server-lib/requireAuth.js';
import { isAdmin } from '../../server-lib/admin.js';

function canManageCommunity(memberRole: string | undefined, user: { role?: string }): boolean {
  return isAdmin(user) || memberRole === 'owner' || memberRole === 'collaborator';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  await initDb();

  const communityId = typeof req.query.communityId === 'string' ? req.query.communityId : null;
  if (!communityId) {
    return res.status(400).json({ message: 'communityId required' });
  }

  const member = await sql`
    SELECT role FROM object_memberships
    WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${user.id}
  `;
  const memberRole = member[0]?.role as string | undefined;
  if (!canManageCommunity(memberRole, user)) {
    return res.status(403).json({ message: 'Not authorized to manage this community' });
  }

  // GET /api/community-admin?communityId=xxx&members=true - member directory
  if (req.method === 'GET' && req.query.members === 'true') {
    try {
      const rows = await sql`
        SELECT om."userId", om.role, om."createdAt" AS "joinedAt", u."fullName", u.email, u."avatarUrl"
        FROM object_memberships om
        INNER JOIN users u ON u.id = om."userId"
        WHERE om."objectType" = 'community' AND om."objectId" = ${communityId}
        ORDER BY
          CASE om.role WHEN 'owner' THEN 1 WHEN 'collaborator' THEN 2 ELSE 3 END,
          u."fullName"
      `;
      const members = rows.map((r) => ({
        userId: r.userId,
        fullName: r.fullName,
        email: r.email,
        avatarUrl: r.avatarUrl ?? null,
        role: r.role,
        joinedAt: r.joinedAt,
      }));
      return res.json({ members });
    } catch (err) {
      console.error('Get members error:', err);
      return res.status(500).json({ message: 'Failed to fetch members' });
    }
  }

  // GET /api/community-admin?communityId=xxx&joinRequests=true - pending join requests
  if (req.method === 'GET' && req.query.joinRequests === 'true') {
    try {
      const rows = await sql`
        SELECT cjr.id, cjr."userId", cjr."requestedAt", u."fullName", u.email, u."avatarUrl"
        FROM community_join_requests cjr
        INNER JOIN users u ON u.id = cjr."userId"
        WHERE cjr."communityId" = ${communityId} AND cjr.status = 'pending'
        ORDER BY cjr."requestedAt" ASC
      `;
      const requests = rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        fullName: r.fullName,
        email: r.email,
        avatarUrl: r.avatarUrl ?? null,
        requestedAt: r.requestedAt,
      }));
      return res.json({ requests });
    } catch (err) {
      console.error('Get join requests error:', err);
      return res.status(500).json({ message: 'Failed to fetch join requests' });
    }
  }

  // GET /api/community-admin?communityId=xxx&invites=true - pending invites
  if (req.method === 'GET' && req.query.invites === 'true') {
    try {
      const rows = await sql`
        SELECT id, email, "invitedAt" FROM community_invites
        WHERE "communityId" = ${communityId} AND status = 'pending'
        ORDER BY "invitedAt" DESC
      `;
      return res.json({ invites: rows });
    } catch (err) {
      console.error('Get invites error:', err);
      return res.status(500).json({ message: 'Failed to fetch invites' });
    }
  }

  // POST - actions: approve-join, reject-join, remove-member, invite
  if (req.method === 'POST') {
    const body = req.body || {};

    if (body.action === 'approve-join' && body.requestId) {
      const requestId = String(body.requestId);
      const reqRow = await sql`
        SELECT "userId" FROM community_join_requests
        WHERE id = ${requestId} AND "communityId" = ${communityId} AND status = 'pending'
      `;
      if (reqRow.length === 0) return res.status(404).json({ message: 'Join request not found' });
      const targetUserId = (reqRow[0] as { userId: string }).userId;
      const existing = await sql`
        SELECT 1 FROM object_memberships
        WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${targetUserId}
      `;
      if (existing.length > 0) {
        await sql`UPDATE community_join_requests SET status = 'approved', "reviewedBy" = ${user.id}, "reviewedAt" = NOW() WHERE id = ${requestId}`;
        return res.json({ ok: true, message: 'Already a member' });
      }
      await sql`
        INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
        VALUES (${crypto.randomUUID()}, 'community', ${communityId}, ${targetUserId}, 'viewer')
      `;
      await sql`
        UPDATE community_join_requests SET status = 'approved', "reviewedBy" = ${user.id}, "reviewedAt" = NOW() WHERE id = ${requestId}
      `;
      return res.json({ ok: true });
    }

    if (body.action === 'reject-join' && body.requestId) {
      const requestId = String(body.requestId);
      await sql`
        UPDATE community_join_requests SET status = 'rejected', "reviewedBy" = ${user.id}, "reviewedAt" = NOW()
        WHERE id = ${requestId} AND "communityId" = ${communityId} AND status = 'pending'
      `;
      return res.json({ ok: true });
    }

    if (body.action === 'remove-member' && body.userId) {
      const targetUserId = String(body.userId);
      if (targetUserId === user.id) return res.status(400).json({ message: 'Cannot remove yourself' });
      const targetMember = await sql`
        SELECT role FROM object_memberships
        WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${targetUserId}
      `;
      if (targetMember.length === 0) return res.status(404).json({ message: 'Member not found' });
      const targetRole = (targetMember[0] as { role: string }).role;
      if (targetRole === 'owner') return res.status(403).json({ message: 'Cannot remove community owner' });
      if (memberRole !== 'owner' && targetRole === 'collaborator') {
        return res.status(403).json({ message: 'Only owner can remove collaborators' });
      }
      await sql`
        DELETE FROM object_memberships
        WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${targetUserId}
      `;
      return res.json({ ok: true });
    }

    if (body.action === 'invite' && body.email) {
      const email = String(body.email).toLowerCase().trim();
      if (!email) return res.status(400).json({ message: 'Email required' });
      const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existingUser.length > 0) {
        const uid = (existingUser[0] as { id: string }).id;
        const alreadyMember = await sql`
          SELECT 1 FROM object_memberships
          WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${uid}
        `;
        if (alreadyMember.length > 0) return res.status(400).json({ message: 'User is already a member' });
      }
      const existingInvite = await sql`
        SELECT 1 FROM community_invites
        WHERE "communityId" = ${communityId} AND email = ${email} AND status = 'pending'
      `;
      if (existingInvite.length > 0) return res.status(400).json({ message: 'Invite already sent' });
      const inviteId = crypto.randomUUID();
      await sql`
        INSERT INTO community_invites (id, "communityId", email, "invitedBy", status)
        VALUES (${inviteId}, ${communityId}, ${email}, ${user.id}, 'pending')
      `;
      return res.status(201).json({ invite: { id: inviteId, email } });
    }

    return res.status(400).json({ message: 'Invalid action' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
