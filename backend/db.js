import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'ohfacilitators.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    fullName TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    locale TEXT DEFAULT 'en',
    createdAt TEXT DEFAULT (datetime('now'))
  )
`);

// Create places table
db.exec(`
  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT,
    lat REAL,
    lng REAL,
    communityId TEXT,
    visibility TEXT DEFAULT 'draft',
    imageUrl TEXT,
    createdBy TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (createdBy) REFERENCES users(id)
  )
`);

// Create place_hosts table
db.exec(`
  CREATE TABLE IF NOT EXISTS place_hosts (
    id TEXT PRIMARY KEY,
    placeId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT DEFAULT 'owner',
    createdAt TEXT DEFAULT (datetime('now')),
    UNIQUE(placeId, userId),
    FOREIGN KEY (placeId) REFERENCES places(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create events table
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    imageUrl TEXT,
    placeId TEXT,
    communityId TEXT,
    startAt TEXT NOT NULL,
    endAt TEXT,
    capacity INTEGER,
    status TEXT DEFAULT 'proposed',
    proposed_by TEXT NOT NULL,
    venue_approved_at TEXT,
    createdBy TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (placeId) REFERENCES places(id),
    FOREIGN KEY (proposed_by) REFERENCES users(id),
    FOREIGN KEY (createdBy) REFERENCES users(id)
  )
`);

// Create bookings table
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    eventId TEXT NOT NULL,
    userId TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create place_availability table
db.exec(`
  CREATE TABLE IF NOT EXISTS place_availability (
    id TEXT PRIMARY KEY,
    placeId TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (placeId) REFERENCES places(id) ON DELETE CASCADE
  )
`);

// Create facilitator_availability table
db.exec(`
  CREATE TABLE IF NOT EXISTS facilitator_availability (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create member_availability table
db.exec(`
  CREATE TABLE IF NOT EXISTS member_availability (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    communityId TEXT,
    date TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create communities table
db.exec(`
  CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    visibility TEXT DEFAULT 'public',
    type TEXT DEFAULT 'open',
    createdBy TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (createdBy) REFERENCES users(id)
  )
`);

// Create unified availability tables
db.exec(`
  CREATE TABLE IF NOT EXISTS availability_profiles (
    id TEXT PRIMARY KEY,
    ownerType TEXT NOT NULL CHECK(ownerType IN ('USER', 'VENUE')),
    ownerId TEXT NOT NULL,
    timezone TEXT DEFAULT 'Australia/Sydney',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    UNIQUE(ownerType, ownerId)
  );

  CREATE TABLE IF NOT EXISTS availability_slots (
    id TEXT PRIMARY KEY,
    profileId TEXT NOT NULL,
    date TEXT,
    dayOfWeek INTEGER,
    period TEXT NOT NULL CHECK(period IN ('MORNING', 'AFTERNOON', 'EVENING', 'CUSTOM')),
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    status TEXT DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'UNAVAILABLE', 'TENTATIVE')),
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (profileId) REFERENCES availability_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS availability_overrides (
    id TEXT PRIMARY KEY,
    profileId TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('BLOCKED', 'BOOKED')),
    notes TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (profileId) REFERENCES availability_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS community_members (
    id TEXT PRIMARY KEY,
    communityId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    createdAt TEXT DEFAULT (datetime('now')),
    UNIQUE(communityId, userId),
    FOREIGN KEY (communityId) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Create indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_events_placeId ON events(placeId);
  CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  CREATE INDEX IF NOT EXISTS idx_events_startAt ON events(startAt);
  CREATE INDEX IF NOT EXISTS idx_bookings_eventId ON bookings(eventId);
  CREATE INDEX IF NOT EXISTS idx_bookings_userId ON bookings(userId);
  CREATE INDEX IF NOT EXISTS idx_place_hosts_placeId ON place_hosts(placeId);
  CREATE INDEX IF NOT EXISTS idx_place_hosts_userId ON place_hosts(userId);
  CREATE INDEX IF NOT EXISTS idx_place_availability_placeId_date ON place_availability(placeId, date);
  CREATE INDEX IF NOT EXISTS idx_facilitator_availability_userId_date ON facilitator_availability(userId, date);
  CREATE INDEX IF NOT EXISTS idx_availability_profiles_owner ON availability_profiles(ownerType, ownerId);
  CREATE INDEX IF NOT EXISTS idx_availability_slots_profile_date ON availability_slots(profileId, date);
  CREATE INDEX IF NOT EXISTS idx_availability_slots_profile_day ON availability_slots(profileId, dayOfWeek);
  CREATE INDEX IF NOT EXISTS idx_availability_overrides_profile_date ON availability_overrides(profileId, date);
  CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(communityId);
  CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(userId);
`);

export { db };

// Hash password helper
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Verify password helper
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
