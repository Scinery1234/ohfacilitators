import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Ensure tables exist
export async function initDb() {
  // ─── Tenants (multi-tenancy root) ───────────────────────────────────────────
  // Each tenant is an OhPlaces account (host studio, wellness centre, etc.)
  await sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      domain TEXT,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#000000',
      stripe_account_id TEXT,
      cal_api_key TEXT,
      twilio_number TEXT,
      purposefields_opt_in BOOLEAN DEFAULT false,
      plan TEXT NOT NULL DEFAULT 'starter',
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS tenants_slug_idx ON tenants(slug)`;
  await sql`CREATE INDEX IF NOT EXISTS tenants_domain_idx ON tenants(domain)`;

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
  // Multi-tenancy
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL`;
  await sql`CREATE INDEX IF NOT EXISTS bookings_tenant_idx ON bookings(tenant_id)`;
  // Payment tracking (Stripe)
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_required'`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid INTEGER`; -- cents
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS platform_fee INTEGER`; -- cents
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_pi_idx ON bookings(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL`;
  // Cal.com reservation
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cal_booking_uid TEXT`;
  // SMS tracking flags (atomic — set true once sent, never reset)
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sms_confirmation_sent BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sms_reminder_24h_sent BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sms_reminder_1h_sent BOOLEAN DEFAULT false`;
  // Attendance
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attended BOOLEAN`;

  // trust_tier: unverified | verified (additive, lives only in Profile)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'unverified'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "locationArea" TEXT`;
  // Multi-tenancy: participant/host scoped to a tenant
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL`;
  // SMS delivery: phone number in E.164 format e.g. +61412345678
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS users_tenant_idx ON users(tenant_id)`;

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
  // Multi-tenancy
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL`;
  await sql`CREATE INDEX IF NOT EXISTS events_tenant_idx ON events(tenant_id)`;
  // OhPlaces booking flow fields
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS host_id TEXT REFERENCES users(id)`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_id TEXT`; -- FK to venues added after venues table
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS cal_event_type_id TEXT`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'in_person'`; -- in_person | online | hybrid
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0`; -- cents; 0 = free
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'free'`; -- free | fixed | sliding_scale
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS discoverable BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS events_discoverable_idx ON events(discoverable, tenant_id) WHERE discoverable = true`;

  // ─── Venues (tenant-scoped physical spaces) ──────────────────────────────────
  // Separate from "places" (community feature) — these are bookable venue records
  await sql`
    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      address TEXT,
      suburb TEXT,
      city TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      capacity INTEGER,
      purposefields_visible BOOLEAN DEFAULT false,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS venues_tenant_idx ON venues(tenant_id)`;

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
