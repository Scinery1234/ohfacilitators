import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { requireAuth } from '../../server-lib/requireAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();
  const user = await requireAuth(req, res);
  if (!user) return;

  const communityId = typeof req.query.communityId === 'string' ? req.query.communityId : null;

  // GET ?communityId=xxx - list pending requests (community admin only)
  if (req.method === 'GET' && communityId) {
    const member = await sql`
      SELECT role FROM object_memberships
      WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${user.id}
    `;
    if (member.length === 0 || (member[0].role !== 'owner' && member[0].role !== 'collaborator')) {
      return res.status(403).json({ message: 'Not authorized to view link requests' });
    }
    const rows = await sql`
      SELECT r.id, r."communityId", r."objectType", r."objectId", r."requestedBy", r.status, r."createdAt",
        u."fullName" AS "requestedByName"
      FROM community_link_requests r
      LEFT JOIN users u ON u.id = r."requestedBy"
      WHERE r."communityId" = ${communityId} AND r.status = 'pending'
      ORDER BY r."createdAt" DESC
    `;
    const requests = rows.map((r) => ({
      id: r.id,
      communityId: r.communityId,
      objectType: r.objectType,
      objectId: r.objectId,
      requestedBy: r.requestedBy,
      requestedByName: r.requestedByName || null,
      status: r.status,
      createdAt: r.createdAt,
    }));
    return res.json({ requests });
  }

  // POST - create link request (place/event owner requests to link to community)
  if (req.method === 'POST') {
    const { communityId: cid, objectType, objectId } = req.body || {};
    if (!cid || !objectType || !objectId) {
      return res.status(400).json({ message: 'communityId, objectType, and objectId are required' });
    }
    if (objectType !== 'place' && objectType !== 'event') {
      return res.status(400).json({ message: 'objectType must be place or event' });
    }

    const placeOrEventOwner = await sql`
      SELECT role FROM object_memberships
      WHERE "objectType" = ${objectType} AND "objectId" = ${objectId} AND "userId" = ${user.id}
    `;
    if (placeOrEventOwner.length === 0 || (placeOrEventOwner[0].role !== 'owner' && placeOrEventOwner[0].role !== 'collaborator')) {
      return res.status(403).json({ message: 'You can only request to link your own place or event' });
    }

    const communityExists = await sql`SELECT id FROM communities WHERE id = ${cid}`;
    if (communityExists.length === 0) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const existing = await sql`
      SELECT id FROM community_link_requests
      WHERE "communityId" = ${cid} AND "objectType" = ${objectType} AND "objectId" = ${objectId} AND status = 'pending'
    `;
    if (existing.length > 0) {
      return res.status(400).json({ message: 'A pending request already exists for this link' });
    }

    const id = crypto.randomUUID();
    await sql`
      INSERT INTO community_link_requests (id, "communityId", "objectType", "objectId", "requestedBy", status)
      VALUES (${id}, ${cid}, ${objectType}, ${objectId}, ${user.id}, 'pending')
    `;
    const rows = await sql`SELECT * FROM community_link_requests WHERE id = ${id}`;
    return res.status(201).json({ request: rows[0] });
  }

  // PATCH - approve or reject (community admin only)
  if (req.method === 'PATCH') {
    const { requestId, status } = req.body || {};
    if (!requestId || (status !== 'approved' && status !== 'rejected')) {
      return res.status(400).json({ message: 'requestId and status (approved|rejected) are required' });
    }

    const reqRow = await sql`
      SELECT * FROM community_link_requests WHERE id = ${requestId} AND status = 'pending'
    `;
    if (reqRow.length === 0) {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }
    const linkReq = reqRow[0];

    const member = await sql`
      SELECT role FROM object_memberships
      WHERE "objectType" = 'community' AND "objectId" = ${linkReq.communityId} AND "userId" = ${user.id}
    `;
    if (member.length === 0 || (member[0].role !== 'owner' && member[0].role !== 'collaborator')) {
      return res.status(403).json({ message: 'Only community admins can approve or reject requests' });
    }

    await sql`
      UPDATE community_link_requests SET status = ${status} WHERE id = ${requestId}
    `;

    if (status === 'approved') {
      if (linkReq.objectType === 'place') {
        await sql`UPDATE places SET "communityId" = ${linkReq.communityId} WHERE id = ${linkReq.objectId}`;
      } else {
        await sql`UPDATE events SET "communityId" = ${linkReq.communityId} WHERE id = ${linkReq.objectId}`;
      }
    }

    const updated = await sql`SELECT * FROM community_link_requests WHERE id = ${requestId}`;
    return res.json({ request: updated[0] });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
