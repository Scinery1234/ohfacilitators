import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { verifyToken } from '../../server-lib/auth.js';

async function requireAuth(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const { userId } = verifyToken(token);
    const rows = await sql`SELECT id, email, "fullName", role FROM users WHERE id = ${userId}`;
    if (rows.length === 0) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return null;
    }
    return rows[0] as { id: string; role: string; email: string; fullName: string };
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
    return null;
  }
}

async function requireAdmin(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return null;
  }
  return user;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();

  const appId = typeof req.query.id === 'string' ? req.query.id : null;
  const isMe = req.query.me === 'true';

  // Handle GET /api/host-applications?me=true (user's own application)
  if (req.method === 'GET' && isMe) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.slice(7);
    let userId: string;
    try {
      const payload = verifyToken(token);
      userId = payload.userId;
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    try {
      const rows = await sql`
        SELECT id, "userId", status, "applicationData", "createdAt", "updatedAt", "reviewedAt", "reviewedBy"
        FROM host_applications
        WHERE "userId" = ${userId}
      `;

      if (rows.length === 0) {
        return res.json({ application: null });
      }

      const r = rows[0] as { applicationData: Record<string, unknown>; status: string; createdAt: string };
      const data = r.applicationData || {};
      const application = {
        ...data,
        id: (rows[0] as { id: string }).id,
        status: r.status,
        created_at: r.createdAt,
      };
      return res.json({ application });
    } catch (err) {
      console.error('Get my host application error:', err);
      return res.status(500).json({ message: 'Failed to fetch application' });
    }
  }

  // Handle PATCH /api/host-applications?id=xxx (admin review)
  if (req.method === 'PATCH' && appId) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    try {
      const { status } = req.body || {};
      if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ message: "status must be 'approved', 'rejected', or 'pending'" });
      }

      const now = new Date().toISOString();

      const rows = await sql`
        UPDATE host_applications
        SET status = ${status},
            "reviewedBy" = ${admin.id},
            "reviewedAt" = ${now},
            "updatedAt" = ${now}
        WHERE id = ${appId}
        RETURNING id, "userId", status, "applicationData", "createdAt", "updatedAt", "reviewedAt", "reviewedBy"
      `;

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Application not found' });
      }

      if (status === 'approved') {
        const row = rows[0] as { userId: string };
        await sql`
          UPDATE users
          SET role = 'host'
          WHERE id = ${row.userId}
        `;
      }

      return res.json({ application: rows[0] });
    } catch (err) {
      console.error('Review host application error:', err);
      return res.status(500).json({ message: 'Failed to review application' });
    }
  }

  // Handle POST /api/host-applications (create/update)
  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const applicationData = req.body || {};
      const existing = await sql`
        SELECT id, status FROM host_applications WHERE "userId" = ${user.id}
      `;

      const now = new Date().toISOString();

      if (existing.length > 0) {
        const prev = existing[0] as { id: string; status: string };
        if (prev.status !== 'pending') {
          return res.status(400).json({
            message: `Application already ${prev.status}. Contact support if you need changes.`,
          });
        }

        const updated = await sql`
          UPDATE host_applications
          SET "applicationData" = ${JSON.stringify(applicationData)}::jsonb,
              "updatedAt" = ${now}
          WHERE id = ${prev.id}
          RETURNING id, "userId", status, "applicationData", "createdAt", "updatedAt"
        `;
        const r = updated[0] as { applicationData: Record<string, unknown>; createdAt: string };
        const flat = { ...r.applicationData, id: (updated[0] as { id: string }).id, status: (updated[0] as { status: string }).status, created_at: r.createdAt };
        return res.status(200).json(flat);
      }

      const id = crypto.randomUUID();
      const inserted = await sql`
        INSERT INTO host_applications (id, "userId", status, "applicationData")
        VALUES (${id}, ${user.id}, 'pending', ${JSON.stringify(applicationData)}::jsonb)
        RETURNING id, "userId", status, "applicationData", "createdAt", "updatedAt"
      `;
      const r = inserted[0] as { applicationData: Record<string, unknown>; createdAt: string };
      const flat = { ...r.applicationData, id, status: 'pending', created_at: r.createdAt };
      return res.status(201).json(flat);
    } catch (err) {
      console.error('Submit host application error:', err);
      return res.status(500).json({ message: 'Failed to submit application' });
    }
  }

  // Handle GET /api/host-applications (admin list)
  if (req.method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;

      const rows =
        status && status.length > 0
          ? await sql`
              SELECT ha.*, u.email, u."fullName"
              FROM host_applications ha
              JOIN users u ON u.id = ha."userId"
              WHERE ha.status = ${status}
              ORDER BY ha."createdAt" DESC
            `
          : await sql`
              SELECT ha.*, u.email, u."fullName"
              FROM host_applications ha
              JOIN users u ON u.id = ha."userId"
              ORDER BY ha."createdAt" DESC
            `;

      return res.json({ applications: rows });
    } catch (err) {
      console.error('List host applications error:', err);
      return res.status(500).json({ message: 'Failed to fetch applications' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
