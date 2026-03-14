/**
 * Places routes
 */

import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { verifyToken } from '../auth.js';
import crypto from 'crypto';

// Helper to extract userId from optional auth
function getUserIdFromAuth(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      return payload.userId;
    } catch {
      return null;
    }
  }
  return null;
}

const router = Router();

function placeToResponse(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    communityId: row.communityId,
    visibility: row.visibility,
    imageUrl: row.imageUrl,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// GET /places - List places with filters
router.get('/', (req, res) => {
  try {
    const { id, mine, scope, communityId, visibility } = req.query;
    const userId = getUserIdFromAuth(req); // Optional auth for "mine" filter

    let query = 'SELECT * FROM places WHERE 1=1';
    const params = [];

    if (id) {
      query += ' AND id = ?';
      params.push(id);
    }

    if (mine === 'true' && userId) {
      query += ' AND createdBy = ?';
      params.push(userId);
    }

    if (scope === 'my-communities' && userId) {
      // Places in communities where user is a member
      query = `
        SELECT DISTINCT p.* FROM places p
        INNER JOIN communities c ON p.communityId = c.id
        WHERE EXISTS (
          SELECT 1 FROM community_members cm WHERE cm.communityId = c.id AND cm.userId = ?
        )
      `;
      params.push(userId);
    }

    if (communityId) {
      query += ' AND communityId = ?';
      params.push(communityId);
    }

    if (visibility) {
      query += ' AND visibility = ?';
      params.push(visibility);
    }

    query += ' ORDER BY createdAt DESC';

    const places = db.prepare(query).all(...params);
    res.json({ places: places.map(placeToResponse) });
  } catch (err) {
    console.error('Get places error:', err);
    res.status(500).json({ message: 'Failed to fetch places' });
  }
});

// GET /places/:id - Get place detail
router.get('/:id', (req, res) => {
  try {
    const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }
    res.json({ place: placeToResponse(place) });
  } catch (err) {
    console.error('Get place error:', err);
    res.status(500).json({ message: 'Failed to fetch place' });
  }
});

// POST /places - Create place (auto-adds creator as owner)
router.post('/', requireAuth, (req, res) => {
  try {
    const { title, description, address, lat, lng, communityId, visibility, imageUrl } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ message: 'Place title must be at least 3 characters' });
    }

    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    // Create place
    db.prepare(
      `INSERT INTO places (
        id, title, description, address, lat, lng, communityId, visibility, imageUrl, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      title.trim(),
      description || null,
      address || null,
      lat || null,
      lng || null,
      communityId || null,
      visibility || 'draft',
      imageUrl || null,
      req.userId,
      now,
      now
    );

    // Auto-add creator as owner
    const hostId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO place_hosts (id, placeId, userId, role) VALUES (?, ?, ?, ?)').run(
      hostId,
      id,
      req.userId,
      'owner'
    );

    const place = db.prepare('SELECT * FROM places WHERE id = ?').get(id);
    res.status(201).json({ place: placeToResponse(place) });
  } catch (err) {
    console.error('Create place error:', err);
    res.status(500).json({ message: 'Failed to create place' });
  }
});

// PATCH /places/:id - Update place
router.patch('/:id', requireAuth, (req, res) => {
  try {
    const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    // Only creator or host can update
    const isCreator = place.createdBy === req.userId;
    const isHost = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(req.params.id, req.userId);

    if (!isCreator && !isHost) {
      return res.status(403).json({ message: 'Only the place creator or host can update this place' });
    }

    const allowedFields = ['title', 'description', 'address', 'lat', 'lng', 'communityId', 'visibility', 'imageUrl'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const setClause = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), new Date().toISOString(), req.params.id];

    db.prepare(`UPDATE places SET ${setClause}, updatedAt = ? WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
    res.json({ place: placeToResponse(updated) });
  } catch (err) {
    console.error('Update place error:', err);
    res.status(500).json({ message: 'Failed to update place' });
  }
});

// DELETE /places/:id - Delete place
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    // Only creator can delete
    if (place.createdBy !== req.userId) {
      return res.status(403).json({ message: 'Only the place creator can delete this place' });
    }

    db.prepare('DELETE FROM places WHERE id = ?').run(req.params.id);
    res.json({ message: 'Place deleted' });
  } catch (err) {
    console.error('Delete place error:', err);
    res.status(500).json({ message: 'Failed to delete place' });
  }
});

// GET /places/:id/hosts - List place hosts
router.get('/:id/hosts', (req, res) => {
  try {
    const hosts = db
      .prepare(
        `SELECT ph.*, u.email, u.fullName 
         FROM place_hosts ph
         INNER JOIN users u ON ph.userId = u.id
         WHERE ph.placeId = ?`
      )
      .all(req.params.id);
    res.json({ hosts });
  } catch (err) {
    console.error('Get place hosts error:', err);
    res.status(500).json({ message: 'Failed to fetch place hosts' });
  }
});

// POST /places/:id/hosts - Add place host
router.post('/:id/hosts', requireAuth, (req, res) => {
  try {
    const { userId, role = 'manager' } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify requester is place host
    const requesterHost = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(req.params.id, req.userId);
    if (!requesterHost) {
      return res.status(403).json({ message: 'You must be a place host to add hosts' });
    }

    // Check if already host
    const existing = db.prepare('SELECT id FROM place_hosts WHERE placeId = ? AND userId = ?').get(req.params.id, userId);
    if (existing) {
      return res.status(400).json({ message: 'User is already a host for this place' });
    }

    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO place_hosts (id, placeId, userId, role) VALUES (?, ?, ?, ?)').run(
      id,
      req.params.id,
      userId,
      role
    );

    const host = db
      .prepare(
        `SELECT ph.*, u.email, u.fullName 
         FROM place_hosts ph
         INNER JOIN users u ON ph.userId = u.id
         WHERE ph.id = ?`
      )
      .get(id);
    res.status(201).json({ host });
  } catch (err) {
    console.error('Add place host error:', err);
    res.status(500).json({ message: 'Failed to add place host' });
  }
});

// DELETE /places/:id/hosts/:userId - Remove place host
router.delete('/:id/hosts/:userId', requireAuth, (req, res) => {
  try {
    // Verify requester is place host
    const requesterHost = db.prepare('SELECT 1 FROM place_hosts WHERE placeId = ? AND userId = ?').get(req.params.id, req.userId);
    if (!requesterHost) {
      return res.status(403).json({ message: 'You must be a place host to remove hosts' });
    }

    db.prepare('DELETE FROM place_hosts WHERE placeId = ? AND userId = ?').run(req.params.id, req.params.userId);
    res.json({ message: 'Host removed' });
  } catch (err) {
    console.error('Remove place host error:', err);
    res.status(500).json({ message: 'Failed to remove place host' });
  }
});

export default router;
