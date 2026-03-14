import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { verifyPassword, hashPassword, signToken } from '../../server-lib/auth.js';
import { isAdmin } from '../../server-lib/admin.js';

function userToResponse(row: Record<string, unknown>, includeAdmin = false) {
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
  return includeAdmin ? { ...user, isAdmin: isAdmin(user) } : user;
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  await initDb();
  const rows = await sql`SELECT * FROM users WHERE email = ${String(email).toLowerCase()}`;
  if (rows.length === 0) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const row = rows[0];
  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const user = userToResponse(row, true);
  const token = signToken({ userId: row.id });
  return res.json({ token, user });
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  const { email, fullName, password, locale, bio, locationArea } = req.body || {};
  if (!email || !fullName || !password) {
    return res.status(400).json({ message: 'Email, full name, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  await initDb();
  const emailLower = String(email).toLowerCase().trim();
  const existing = await sql`SELECT id FROM users WHERE email = ${emailLower}`;
  if (existing.length > 0) {
    return res.status(400).json({ message: 'An account with this email already exists' });
  }
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const bioVal = typeof bio === 'string' && bio.trim() ? bio.trim() : null;
  const locVal = typeof locationArea === 'string' && locationArea.trim() ? locationArea.trim() : null;
  await sql`
    INSERT INTO users (id, email, "fullName", "passwordHash", role, locale, bio, "locationArea")
    VALUES (${id}, ${emailLower}, ${String(fullName).trim()}, ${passwordHash}, 'user', ${locale || 'en'}, ${bioVal}, ${locVal})
  `;
  const rows = await sql`SELECT id, email, "fullName", role, trust_tier, "avatarUrl", bio, "locationArea" FROM users WHERE id = ${id}`;
  const user = userToResponse(rows[0], true);
  const token = signToken({ userId: id });
  return res.status(201).json({ token, user });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const slug = (req.query.slug as string[] | undefined) || [];
  let action = slug[0];
  if (!action && typeof req.url === 'string') {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const segments = pathname.replace(/^\/api\/auth\/?/, '').split('/').filter(Boolean);
    action = segments[0];
  }
  try {
    if (action === 'login') {
      return await handleLogin(req, res);
    }
    if (action === 'register') {
      return await handleRegister(req, res);
    }
    return res.status(404).json({ message: 'Not found' });
  } catch (err) {
    console.error('Auth error:', err);
    const message = process.env.NODE_ENV === 'production' ? 'Request failed' : (err as Error).message;
    return res.status(500).json({ message });
  }
}
