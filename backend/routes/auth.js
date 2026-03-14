/**
 * Auth routes: signup and login.
 * Email + password only; no 2FA.
 */
import { Router } from 'express';
import { db, hashPassword, verifyPassword } from '../db.js';
import { signToken } from '../auth.js';
import crypto from 'crypto';

const router = Router();

function userToResponse(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role || 'user',
  };
}

router.post('/register', async (req, res) => {
  try {
    const { email, fullName, password, locale } = req.body;

    if (!email || !fullName || !password) {
      return res.status(400).json({ message: 'Email, full name, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password);

    db.prepare(
      'INSERT INTO users (id, email, fullName, passwordHash, role, locale) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, email.toLowerCase().trim(), fullName.trim(), passwordHash, 'user', locale || 'en');

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const user = userToResponse(row);
    const token = signToken({ userId: id });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    const message = process.env.NODE_ENV === 'production'
      ? 'Failed to create account'
      : (err.message || 'Failed to create account');
    res.status(500).json({ message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!row) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const valid = await verifyPassword(password, row.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = userToResponse(row);
    const token = signToken({ userId: row.id });

    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Failed to sign in' });
  }
});

export default router;
