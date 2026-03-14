-- Migration: Unified Availability Engine
-- Converts existing availability tables to unified model
-- Run this after backing up existing data

-- Step 1: Create new unified tables
CREATE TABLE IF NOT EXISTS availability_profiles (
  id TEXT PRIMARY KEY,
  ownerType TEXT NOT NULL CHECK(ownerType IN ('USER', 'VENUE')),
  ownerId TEXT NOT NULL,
  timezone TEXT DEFAULT 'Australia/Sydney',
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  UNIQUE(ownerType, ownerId)
);

CREATE INDEX IF NOT EXISTS idx_availability_profiles_owner ON availability_profiles(ownerType, ownerId);

CREATE TABLE IF NOT EXISTS availability_slots (
  id TEXT PRIMARY KEY,
  profileId TEXT NOT NULL,
  date TEXT, -- null if recurring
  dayOfWeek INTEGER, -- 0-6 (0=Sunday) if recurring
  period TEXT NOT NULL CHECK(period IN ('MORNING', 'AFTERNOON', 'EVENING', 'CUSTOM')),
  startTime TEXT NOT NULL, -- HH:MM format
  endTime TEXT NOT NULL, -- HH:MM format
  status TEXT DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'UNAVAILABLE', 'TENTATIVE')),
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profileId) REFERENCES availability_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_availability_slots_profile_date ON availability_slots(profileId, date);
CREATE INDEX IF NOT EXISTS idx_availability_slots_profile_day ON availability_slots(profileId, dayOfWeek);

CREATE TABLE IF NOT EXISTS availability_overrides (
  id TEXT PRIMARY KEY,
  profileId TEXT NOT NULL,
  date TEXT NOT NULL,
  startTime TEXT NOT NULL, -- HH:MM format
  endTime TEXT NOT NULL, -- HH:MM format
  status TEXT NOT NULL CHECK(status IN ('BLOCKED', 'BOOKED')),
  notes TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profileId) REFERENCES availability_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_availability_overrides_profile_date ON availability_overrides(profileId, date);

-- Step 2: Migrate existing place_availability data
-- Convert to availability_profiles + slots
INSERT INTO availability_profiles (id, ownerType, ownerId, timezone, createdAt, updatedAt)
SELECT DISTINCT
  'profile-' || placeId,
  'VENUE',
  placeId,
  'Australia/Sydney',
  MIN(createdAt),
  MAX(createdAt)
FROM place_availability
GROUP BY placeId;

INSERT INTO availability_slots (id, profileId, date, dayOfWeek, period, startTime, endTime, status, createdAt)
SELECT
  'slot-' || pa.id,
  'profile-' || pa.placeId,
  pa.date,
  NULL, -- Not recurring, specific date
  CASE
    WHEN CAST(substr(pa.startTime, 1, 2) AS INTEGER) < 12 THEN 'MORNING'
    WHEN CAST(substr(pa.startTime, 1, 2) AS INTEGER) < 17 THEN 'AFTERNOON'
    ELSE 'EVENING'
  END,
  pa.startTime,
  pa.endTime,
  'AVAILABLE',
  pa.createdAt
FROM place_availability pa;

-- Step 3: Migrate existing facilitator_availability data
INSERT INTO availability_profiles (id, ownerType, ownerId, timezone, createdAt, updatedAt)
SELECT DISTINCT
  'profile-user-' || userId,
  'USER',
  userId,
  'Australia/Sydney',
  MIN(createdAt),
  MAX(createdAt)
FROM facilitator_availability
GROUP BY userId;

INSERT INTO availability_slots (id, profileId, date, dayOfWeek, period, startTime, endTime, status, createdAt)
SELECT
  'slot-' || fa.id,
  'profile-user-' || fa.userId,
  fa.date,
  NULL,
  CASE
    WHEN CAST(substr(fa.startTime, 1, 2) AS INTEGER) < 12 THEN 'MORNING'
    WHEN CAST(substr(fa.startTime, 1, 2) AS INTEGER) < 17 THEN 'AFTERNOON'
    ELSE 'EVENING'
  END,
  fa.startTime,
  fa.endTime,
  'AVAILABLE',
  fa.createdAt
FROM facilitator_availability fa;

-- Step 4: Migrate existing member_availability data (date-only, no time)
-- These become recurring slots for that day of week
INSERT INTO availability_profiles (id, ownerType, ownerId, timezone, createdAt, updatedAt)
SELECT DISTINCT
  'profile-user-' || userId,
  'USER',
  userId,
  'Australia/Sydney',
  MIN(createdAt),
  MAX(createdAt)
FROM member_availability
WHERE NOT EXISTS (
  SELECT 1 FROM availability_profiles 
  WHERE ownerType = 'USER' AND ownerId = member_availability.userId
)
GROUP BY userId;

-- For member availability, we'll create recurring slots for the day of week
-- Note: This is a simplified migration - you may want to preserve specific dates as overrides
INSERT INTO availability_slots (id, profileId, date, dayOfWeek, period, startTime, endTime, status, createdAt)
SELECT DISTINCT
  'slot-member-' || ma.id,
  'profile-user-' || ma.userId,
  NULL, -- Recurring
  CAST(strftime('%w', ma.date) AS INTEGER), -- Day of week (0=Sunday)
  'CUSTOM', -- All day availability
  '00:00',
  '23:59',
  'AVAILABLE',
  ma.createdAt
FROM member_availability ma;

-- Step 5: Create overrides from bookings (if bookings table exists)
-- This would mark booked times as overrides
-- Note: Adjust based on your bookings schema
-- INSERT INTO availability_overrides (id, profileId, date, startTime, endTime, status, notes, createdAt)
-- SELECT
--   'override-' || b.id,
--   'profile-' || e.placeId,
--   date(b.startAt),
--   time(b.startAt),
--   time(b.endAt),
--   'BOOKED',
--   'Booking: ' || b.id,
--   b.createdAt
-- FROM bookings b
-- JOIN events e ON b.eventId = e.id
-- WHERE e.placeId IS NOT NULL;

-- Old tables can be kept for backward compatibility or dropped after verification
-- DROP TABLE IF EXISTS place_availability;
-- DROP TABLE IF EXISTS facilitator_availability;
-- DROP TABLE IF EXISTS member_availability;
