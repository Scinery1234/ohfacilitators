import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Ensure tables exist
export async function initDb() {
  // Users
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      "fullName" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      locale TEXT DEFAULT 'en',
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Host applications
  await sql`
    CREATE TABLE IF NOT EXISTS host_applications (
      id TEXT PRIMARY KEY,
      "userId" TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      "applicationData" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "reviewedBy" TEXT REFERENCES users(id),
      "reviewedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Bookings
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "hostId" TEXT REFERENCES users(id),
      "listingType" TEXT NOT NULL,
      "listingId" TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      "startAt" TIMESTAMPTZ,
      "endAt" TIMESTAMPTZ,
      notes TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings("userId")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS bookings_host_idx ON bookings("hostId")
  `;

  // trust_tier: unverified | verified (additive, lives only in Profile)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'unverified'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "locationArea" TEXT`;

  // Communities (object-based management)
  await sql`
    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT,
      visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'unlisted', 'public')),
      "createdBy" TEXT NOT NULL REFERENCES users(id),
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS communities_slug_idx ON communities(slug)`;
  await sql`CREATE INDEX IF NOT EXISTS communities_created_by_idx ON communities("createdBy")`;
  await sql`CREATE INDEX IF NOT EXISTS communities_visibility_idx ON communities(visibility)`;
  await sql`CREATE INDEX IF NOT EXISTS communities_visibility_created_idx ON communities(visibility, "createdAt" DESC)`;
  await sql`ALTER TABLE communities ADD COLUMN IF NOT EXISTS "locationArea" TEXT`;
  await sql`ALTER TABLE communities ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'open'`;
  await sql`ALTER TABLE communities ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`;
  await sql`ALTER TABLE communities ADD COLUMN IF NOT EXISTS "codeOfConduct" TEXT`;
  await sql`ALTER TABLE communities ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'`;
  await sql`ALTER TABLE communities ADD COLUMN IF NOT EXISTS "joinApproval" TEXT DEFAULT 'auto'`;

  // Community join requests (for manual / invite-only approval)
  await sql`
    CREATE TABLE IF NOT EXISTS community_join_requests (
      id TEXT PRIMARY KEY,
      "communityId" TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      "requestedAt" TIMESTAMPTZ DEFAULT NOW(),
      "reviewedBy" TEXT REFERENCES users(id),
      "reviewedAt" TIMESTAMPTZ,
      UNIQUE("communityId", "userId")
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS community_join_requests_community_idx ON community_join_requests("communityId")`;

  // Community invites (invite-only flow)
  await sql`
    CREATE TABLE IF NOT EXISTS community_invites (
      id TEXT PRIMARY KEY,
      "communityId" TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      "invitedBy" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "invitedAt" TIMESTAMPTZ DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired'))
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS community_invites_community_idx ON community_invites("communityId")`;

  // Link requests: request to link a place/event to a community (admin approval)
  await sql`
    CREATE TABLE IF NOT EXISTS community_link_requests (
      id TEXT PRIMARY KEY,
      "communityId" TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      "objectType" TEXT NOT NULL CHECK ("objectType" IN ('place', 'event')),
      "objectId" TEXT NOT NULL,
      "requestedBy" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS community_link_requests_community_idx ON community_link_requests("communityId")`;

  // Places (object-based management)
  await sql`
    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      address TEXT,
      "communityId" TEXT REFERENCES communities(id) ON DELETE SET NULL,
      visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'unlisted', 'public')),
      "createdBy" TEXT NOT NULL REFERENCES users(id),
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE places ADD COLUMN IF NOT EXISTS "communityId" TEXT REFERENCES communities(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE places ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`;
  await sql`ALTER TABLE places ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`;
  await sql`ALTER TABLE places ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION`;
  await sql`CREATE INDEX IF NOT EXISTS places_community_idx ON places("communityId")`;

  // Events (object-based management)
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      "placeId" TEXT REFERENCES places(id) ON DELETE SET NULL,
      "communityId" TEXT REFERENCES communities(id) ON DELETE SET NULL,
      "startAt" TIMESTAMPTZ NOT NULL,
      "endAt" TIMESTAMPTZ,
      capacity INT,
      visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'unlisted', 'public')),
      "createdBy" TEXT NOT NULL REFERENCES users(id),
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS "communityId" TEXT REFERENCES communities(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS events_community_idx ON events("communityId")`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'public'`;

  // Object memberships: ownership/collaboration (owner | collaborator | viewer)
  await sql`
    CREATE TABLE IF NOT EXISTS object_memberships (
      id TEXT PRIMARY KEY,
      "objectType" TEXT NOT NULL CHECK ("objectType" IN ('place', 'event', 'community')),
      "objectId" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'collaborator', 'viewer')),
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE("objectType", "objectId", "userId")
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS object_memberships_user_idx ON object_memberships("userId")`;
  await sql`CREATE INDEX IF NOT EXISTS object_memberships_object_idx ON object_memberships("objectType", "objectId")`;

  // Conversations (DM + contact inquiries)
  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('dm', 'contact')),
      "contextType" TEXT,
      "contextId" TEXT,
      "contextTitle" TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS conversations_updated_idx ON conversations("updatedAt" DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      id TEXT PRIMARY KEY,
      "conversationId" TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "lastReadAt" TIMESTAMPTZ,
      "joinedAt" TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE("conversationId", "userId")
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS conversation_participants_user_idx ON conversation_participants("userId")`;
  await sql`CREATE INDEX IF NOT EXISTS conversation_participants_conversation_idx ON conversation_participants("conversationId")`;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      "conversationId" TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      "senderId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages("conversationId")`;
  await sql`CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages("conversationId", "createdAt" DESC)`;

  // User blocks (for future block/mute)
  await sql`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id TEXT PRIMARY KEY,
      "blockerId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "blockedId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE("blockerId", "blockedId")
    )
  `;
}

export { sql };
