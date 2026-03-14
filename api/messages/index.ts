import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { initDb, sql } from '../../server-lib/db.js';
import { requireAuth } from '../../server-lib/requireAuth.js';

const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // max messages per window per user

// Simple in-memory rate limit (resets on serverless cold start - acceptable for MVP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function usersShareCommunity(userId1: string, userId2: string): Promise<boolean> {
  return sql`
    SELECT 1 FROM object_memberships a
    INNER JOIN object_memberships b ON a."objectType" = 'community' AND b."objectType" = 'community'
      AND a."objectId" = b."objectId" AND a."userId" = ${userId1} AND b."userId" = ${userId2}
    LIMIT 1
  `.then((rows) => rows.length > 0);
}

function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  return sql`
    SELECT 1 FROM user_blocks WHERE "blockerId" = ${blockerId} AND "blockedId" = ${blockedId} LIMIT 1
  `.then((rows) => rows.length > 0);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  await initDb();

  // GET /api/messages?conversations=true - list conversations with last message and unread
  if (req.method === 'GET' && req.query.conversations === 'true') {
    try {
      const rows = await sql`
        SELECT c.id, c.type, c."contextType", c."contextId", c."contextTitle", c."updatedAt"
        FROM conversation_participants cp
        INNER JOIN conversations c ON c.id = cp."conversationId"
        WHERE cp."userId" = ${user.id}
        ORDER BY c."updatedAt" DESC
      `;

      const convos = await Promise.all(
        rows.map(async (r) => {
          const rid = (r as { id: string }).id;
          const other = await sql`
            SELECT u.id, u."fullName", u."avatarUrl" FROM users u
            INNER JOIN conversation_participants cp ON cp."userId" = u.id
            WHERE cp."conversationId" = ${rid} AND cp."userId" != ${user.id}
          `;
          const lastMsg = await sql`
            SELECT content, "createdAt", "senderId" FROM messages
            WHERE "conversationId" = ${rid} ORDER BY "createdAt" DESC LIMIT 1
          `;
          const part = await sql`
            SELECT "lastReadAt" FROM conversation_participants
            WHERE "conversationId" = ${rid} AND "userId" = ${user.id}
          `;
          const lastReadAt = (part[0] as { lastReadAt: string | null })?.lastReadAt ?? null;
          const unreadRes = lastReadAt
            ? await sql`SELECT COUNT(*)::int AS c FROM messages WHERE "conversationId" = ${rid} AND "senderId" != ${user.id} AND "createdAt" > ${lastReadAt}`
            : await sql`SELECT COUNT(*)::int AS c FROM messages WHERE "conversationId" = ${rid} AND "senderId" != ${user.id}`;
          const unreadCount = Number((unreadRes[0] as { c: number })?.c ?? 0);
          const o = other[0] as { id: string; fullName: string; avatarUrl: string | null } | undefined;
          const m = lastMsg[0] as { content: string; createdAt: string; senderId: string } | undefined;
          return {
            id: rid,
            type: (r as { type: string }).type,
            contextType: (r as { contextType: string | null }).contextType ?? null,
            contextId: (r as { contextId: string | null }).contextId ?? null,
            contextTitle: (r as { contextTitle: string | null }).contextTitle ?? null,
            updatedAt: (r as { updatedAt: string }).updatedAt,
            otherUser: o ? { id: o.id, fullName: o.fullName, avatarUrl: o.avatarUrl ?? null } : null,
            lastMessage: m ? { content: m.content, createdAt: m.createdAt, senderId: m.senderId } : null,
            unreadCount,
          };
        })
      );

      return res.json({ conversations: convos });
    } catch (err) {
      console.error('List conversations error:', err);
      return res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  }

  // GET /api/messages?unreadCount=true - for nav badge
  if (req.method === 'GET' && req.query.unreadCount === 'true') {
    try {
      const rows = await sql`
        SELECT cp."conversationId", cp."lastReadAt"
        FROM conversation_participants cp
        WHERE cp."userId" = ${user.id}
      `;
      let total = 0;
      for (const r of rows) {
        const lastReadAt = (r as { lastReadAt: string | null }).lastReadAt ?? null;
        const count = await sql`
          SELECT COUNT(*)::int AS c FROM messages
          WHERE "conversationId" = ${(r as { conversationId: string }).conversationId}
          AND "senderId" != ${user.id}
          AND (${lastReadAt}::timestamptz IS NULL OR "createdAt" > ${lastReadAt}::timestamptz)
        `;
        total += Number((count[0] as { c: number })?.c ?? 0);
      }
      return res.json({ unreadCount: total });
    } catch (err) {
      console.error('Unread count error:', err);
      return res.status(500).json({ message: 'Failed to fetch unread count' });
    }
  }

  const conversationId = typeof req.query.conversationId === 'string' ? req.query.conversationId : null;

  // GET /api/messages?conversationId=xxx - get messages in conversation
  if (req.method === 'GET' && conversationId) {
    try {
      const participant = await sql`
        SELECT 1 FROM conversation_participants
        WHERE "conversationId" = ${conversationId} AND "userId" = ${user.id}
      `;
      if (participant.length === 0) {
        return res.status(403).json({ message: 'Not a participant in this conversation' });
      }
      const messages = await sql`
        SELECT m.id, m."senderId", m.content, m."createdAt", u."fullName", u."avatarUrl"
        FROM messages m
        INNER JOIN users u ON u.id = m."senderId"
        WHERE m."conversationId" = ${conversationId}
        ORDER BY m."createdAt" ASC
      `;
      const conv = await sql`SELECT id, type, "contextType", "contextId", "contextTitle" FROM conversations WHERE id = ${conversationId}`;
      const other = await sql`
        SELECT u.id, u."fullName", u."avatarUrl" FROM users u
        INNER JOIN conversation_participants cp ON cp."userId" = u.id
        WHERE cp."conversationId" = ${conversationId} AND cp."userId" != ${user.id}
      `;
      return res.json({
        conversation: conv[0] ?? null,
        otherUser: other[0] ?? null,
        messages: messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          createdAt: m.createdAt,
          senderName: m.fullName,
          senderAvatarUrl: m.avatarUrl ?? null,
        })),
      });
    } catch (err) {
      console.error('Get messages error:', err);
      return res.status(500).json({ message: 'Failed to fetch messages' });
    }
  }

  // POST /api/messages - create conversation or send message
  if (req.method === 'POST') {
    const body = req.body || {};

    // POST: create DM conversation
    if (body.action === 'start-dm' && body.otherUserId) {
      const otherUserId = String(body.otherUserId).trim();
      if (otherUserId === user.id) {
        return res.status(400).json({ message: 'Cannot message yourself' });
      }
      const blocked = await isBlocked(user.id, otherUserId);
      if (blocked) return res.status(403).json({ message: 'You cannot message this user' });
      const blockedReverse = await isBlocked(otherUserId, user.id);
      if (blockedReverse) return res.status(403).json({ message: 'You cannot message this user' });

      const sharesCommunity = await usersShareCommunity(user.id, otherUserId);
      if (!sharesCommunity) {
        return res.status(403).json({ message: 'You can only message people in your communities' });
      }

      const firstMessage = typeof body.firstMessage === 'string' ? body.firstMessage.trim() : '';
      if (!firstMessage || firstMessage.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: 'First message is required (max 2000 characters)' });
      }

      if (!checkRateLimit(user.id)) {
        return res.status(429).json({ message: 'Too many messages. Please slow down.' });
      }

      try {
        // Check for existing DM
        const existing = await sql`
          SELECT c.id FROM conversations c
          INNER JOIN conversation_participants cp1 ON cp1."conversationId" = c.id AND cp1."userId" = ${user.id}
          INNER JOIN conversation_participants cp2 ON cp2."conversationId" = c.id AND cp2."userId" = ${otherUserId}
          WHERE c.type = 'dm'
        `;
        if (existing.length > 0) {
          const convId = (existing[0] as { id: string }).id;
          const msgId = crypto.randomUUID();
          await sql`
            INSERT INTO messages (id, "conversationId", "senderId", content)
            VALUES (${msgId}, ${convId}, ${user.id}, ${firstMessage})
          `;
          await sql`
            UPDATE conversations SET "updatedAt" = NOW() WHERE id = ${convId}
          `;
          const msg = await sql`
            SELECT m.id, m."senderId", m.content, m."createdAt", u."fullName", u."avatarUrl"
            FROM messages m INNER JOIN users u ON u.id = m."senderId" WHERE m.id = ${msgId}
          `;
          return res.status(201).json({
            conversation: { id: convId, type: 'dm' },
            message: {
              id: msg[0].id,
              senderId: msg[0].senderId,
              content: msg[0].content,
              createdAt: msg[0].createdAt,
              senderName: msg[0].fullName,
              senderAvatarUrl: msg[0].avatarUrl ?? null,
            },
          });
        }

        const convId = crypto.randomUUID();
        await sql`
          INSERT INTO conversations (id, type) VALUES (${convId}, 'dm')
        `;
        await sql`
          INSERT INTO conversation_participants (id, "conversationId", "userId")
          VALUES (${crypto.randomUUID()}, ${convId}, ${user.id}), (${crypto.randomUUID()}, ${convId}, ${otherUserId})
        `;
        const msgId = crypto.randomUUID();
        await sql`
          INSERT INTO messages (id, "conversationId", "senderId", content)
          VALUES (${msgId}, ${convId}, ${user.id}, ${firstMessage})
        `;
        const msg = await sql`
          SELECT m.id, m."senderId", m.content, m."createdAt", u."fullName", u."avatarUrl"
          FROM messages m INNER JOIN users u ON u.id = m."senderId" WHERE m.id = ${msgId}
        `;
        return res.status(201).json({
          conversation: { id: convId, type: 'dm' },
          message: {
            id: msg[0].id,
            senderId: msg[0].senderId,
            content: msg[0].content,
            createdAt: msg[0].createdAt,
            senderName: msg[0].fullName,
            senderAvatarUrl: msg[0].avatarUrl ?? null,
          },
        });
      } catch (err) {
        console.error('Start DM error:', err);
        return res.status(500).json({ message: 'Failed to start conversation' });
      }
    }

    // POST: create contact inquiry
    if (body.action === 'start-contact' && body.recipientUserId) {
      const recipientUserId = String(body.recipientUserId).trim();
      const contextType = typeof body.contextType === 'string' ? body.contextType.trim() || null : null;
      const contextId = typeof body.contextId === 'string' ? body.contextId.trim() || null : null;
      const contextTitle = typeof body.contextTitle === 'string' ? body.contextTitle.trim() || null : null;

      if (recipientUserId === user.id) {
        return res.status(400).json({ message: 'Cannot contact yourself' });
      }

      const firstMessage = typeof body.firstMessage === 'string' ? body.firstMessage.trim() : '';
      if (!firstMessage || firstMessage.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: 'Message is required (max 2000 characters)' });
      }

      // Pre-fill hint: "I'm interested in [Event/Place name]..."
      if (!checkRateLimit(user.id)) {
        return res.status(429).json({ message: 'Too many messages. Please slow down.' });
      }

      try {
        // Check for existing contact with same recipient
        const anyContact = await sql`
          SELECT c.id FROM conversations c
          INNER JOIN conversation_participants cp1 ON cp1."conversationId" = c.id AND cp1."userId" = ${user.id}
          INNER JOIN conversation_participants cp2 ON cp2."conversationId" = c.id AND cp2."userId" = ${recipientUserId}
          WHERE c.type = 'contact'
        `;

        let convId: string;
        if (anyContact.length > 0) {
          convId = (anyContact[0] as { id: string }).id;
          await sql`
            UPDATE conversations SET "updatedAt" = NOW(),
              "contextType" = COALESCE(${contextType}, "contextType"),
              "contextId" = COALESCE(${contextId}, "contextId"),
              "contextTitle" = COALESCE(${contextTitle}, "contextTitle")
            WHERE id = ${convId}
          `;
        } else {
          convId = crypto.randomUUID();
          await sql`
            INSERT INTO conversations (id, type, "contextType", "contextId", "contextTitle")
            VALUES (${convId}, 'contact', ${contextType}, ${contextId}, ${contextTitle})
          `;
          await sql`
            INSERT INTO conversation_participants (id, "conversationId", "userId")
            VALUES (${crypto.randomUUID()}, ${convId}, ${user.id}), (${crypto.randomUUID()}, ${convId}, ${recipientUserId})
          `;
        }

        const msgId = crypto.randomUUID();
        await sql`
          INSERT INTO messages (id, "conversationId", "senderId", content)
          VALUES (${msgId}, ${convId}, ${user.id}, ${firstMessage})
        `;
        await sql`UPDATE conversations SET "updatedAt" = NOW() WHERE id = ${convId}`;

        const msg = await sql`
          SELECT m.id, m."senderId", m.content, m."createdAt", u."fullName", u."avatarUrl"
          FROM messages m INNER JOIN users u ON u.id = m."senderId" WHERE m.id = ${msgId}
        `;
        return res.status(201).json({
          conversation: { id: convId, type: 'contact', contextType, contextId, contextTitle },
          message: {
            id: msg[0].id,
            senderId: msg[0].senderId,
            content: msg[0].content,
            createdAt: msg[0].createdAt,
            senderName: msg[0].fullName,
            senderAvatarUrl: msg[0].avatarUrl ?? null,
          },
        });
      } catch (err) {
        console.error('Start contact error:', err);
        return res.status(500).json({ message: 'Failed to send message' });
      }
    }

    // POST: send message in existing conversation
    if (body.conversationId || conversationId) {
      const convId = body.conversationId || conversationId;
      const content = typeof body.content === 'string' ? body.content.trim() : '';
      if (!content || content.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: 'Message content is required (max 2000 characters)' });
      }
      if (!checkRateLimit(user.id)) {
        return res.status(429).json({ message: 'Too many messages. Please slow down.' });
      }
      const participant = await sql`
        SELECT 1 FROM conversation_participants
        WHERE "conversationId" = ${convId} AND "userId" = ${user.id}
      `;
      if (participant.length === 0) {
        return res.status(403).json({ message: 'Not a participant' });
      }
      const msgId = crypto.randomUUID();
      await sql`
        INSERT INTO messages (id, "conversationId", "senderId", content)
        VALUES (${msgId}, ${convId}, ${user.id}, ${content})
      `;
      await sql`UPDATE conversations SET "updatedAt" = NOW() WHERE id = ${convId}`;
      const msg = await sql`
        SELECT m.id, m."senderId", m.content, m."createdAt", u."fullName", u."avatarUrl"
        FROM messages m INNER JOIN users u ON u.id = m."senderId" WHERE m.id = ${msgId}
      `;
      return res.status(201).json({
        message: {
          id: msg[0].id,
          senderId: msg[0].senderId,
          content: msg[0].content,
          createdAt: msg[0].createdAt,
          senderName: msg[0].fullName,
          senderAvatarUrl: msg[0].avatarUrl ?? null,
        },
      });
    }

    return res.status(400).json({ message: 'Invalid request. Provide action and params.' });
  }

  // PATCH /api/messages?conversationId=xxx - mark as read
  if (req.method === 'PATCH' && conversationId) {
    try {
      await sql`
        UPDATE conversation_participants
        SET "lastReadAt" = NOW()
        WHERE "conversationId" = ${conversationId} AND "userId" = ${user.id}
      `;
      return res.json({ ok: true });
    } catch (err) {
      console.error('Mark read error:', err);
      return res.status(500).json({ message: 'Failed to mark as read' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
