import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './db.js';
import { verifyToken } from './auth.js';

export type AuthUser = { id: string; email: string; fullName: string; role?: string };

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<AuthUser | null> {
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
    return rows[0] as AuthUser;
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
    return null;
  }
}
