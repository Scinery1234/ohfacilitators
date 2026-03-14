import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from '../../server-lib/db.js';
import { requireAuth } from '../../server-lib/requireAuth.js';

/**
 * POST /api/admin/set-admin
 * Body: { secret: "<ADMIN_SECRET from env>" }
 * Makes the authenticated user an admin. Requires ADMIN_SECRET to match.
 * Set ADMIN_SECRET in Vercel (or .env) and call this once while logged in as Vik Nithy.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const secret = typeof req.body?.secret === 'string' ? req.body.secret : '';
  const expected = process.env.ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return res.status(403).json({ message: 'Invalid secret' });
  }

  await initDb();
  try {
    await sql`UPDATE users SET role = 'admin' WHERE id = ${user.id}`;
    return res.json({ message: 'You are now an admin.', role: 'admin' });
  } catch (err) {
    console.error('Set admin error:', err);
    return res.status(500).json({ message: 'Failed to set admin' });
  }
}
