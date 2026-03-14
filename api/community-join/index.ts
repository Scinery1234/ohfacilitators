import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { requireAuth } from '../../server-lib/requireAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  await initDb();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { communityId } = req.body || {};
  if (!communityId || typeof communityId !== 'string') {
    return res.status(400).json({ message: 'communityId required' });
  }

  const community = await sql`
    SELECT id, "joinApproval", visibility FROM communities WHERE id = ${communityId}
  `;
  if (community.length === 0) {
    return res.status(404).json({ message: 'Community not found' });
  }
  const c = community[0] as { id: string; joinApproval: string; visibility: string };

  const existing = await sql`
    SELECT role FROM object_memberships
    WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${user.id}
  `;
  if (existing.length > 0) {
    return res.status(400).json({ message: 'Already a member' });
  }

  const joinApproval = c.joinApproval ?? 'auto';

  if (joinApproval === 'invite_only') {
    const invite = await sql`
      SELECT id FROM community_invites
      WHERE "communityId" = ${communityId} AND email = (SELECT email FROM users WHERE id = ${user.id}) AND status = 'pending'
    `;
    if (invite.length === 0) {
      return res.status(403).json({ message: 'This community is invite-only. You need an invite to join.' });
    }
    await sql`
      INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
      VALUES (${crypto.randomUUID()}, 'community', ${communityId}, ${user.id}, 'viewer')
    `;
    await sql`UPDATE community_invites SET status = 'accepted' WHERE id = ${(invite[0] as { id: string }).id}`;
    return res.status(201).json({ status: 'joined' });
  }

  if (joinApproval === 'manual') {
    const invite = await sql`
      SELECT id FROM community_invites
      WHERE "communityId" = ${communityId} AND email = (SELECT email FROM users WHERE id = ${user.id}) AND status = 'pending'
    `;
    if (invite.length > 0) {
      await sql`
        INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
        VALUES (${crypto.randomUUID()}, 'community', ${communityId}, ${user.id}, 'viewer')
      `;
      await sql`UPDATE community_invites SET status = 'accepted' WHERE id = ${(invite[0] as { id: string }).id}`;
      return res.status(201).json({ status: 'joined' });
    }
    const existingReq = await sql`
      SELECT id FROM community_join_requests
      WHERE "communityId" = ${communityId} AND "userId" = ${user.id} AND status = 'pending'
    `;
    if (existingReq.length > 0) {
      return res.status(400).json({ message: 'Join request already pending' });
    }
    const reqId = crypto.randomUUID();
    await sql`
      INSERT INTO community_join_requests (id, "communityId", "userId", status)
      VALUES (${reqId}, ${communityId}, ${user.id}, 'pending')
    `;
    return res.status(201).json({ status: 'pending', message: 'Join request sent. A community manager will review it.' });
  }

  // auto - add directly
  await sql`
    INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
    VALUES (${crypto.randomUUID()}, 'community', ${communityId}, ${user.id}, 'viewer')
  `;
  return res.status(201).json({ status: 'joined' });
}
