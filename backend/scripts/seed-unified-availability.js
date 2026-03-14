/**
 * Seed script for Unified Availability Engine
 * Creates demo data: 1 community, 20 members, 2 facilitators, 1 host, 2 venues
 */

import { db } from '../db.js';
import crypto from 'crypto';

function randomUUID() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

// Helper: Get or create availability profile
function getOrCreateProfile(ownerType, ownerId) {
  let profile = db
    .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
    .get(ownerType, ownerId);

  if (!profile) {
    const id = randomUUID();
    db.prepare('INSERT INTO availability_profiles (id, ownerType, ownerId, timezone) VALUES (?, ?, ?, ?)').run(
      id,
      ownerType,
      ownerId,
      'Australia/Sydney'
    );
    profile = db.prepare('SELECT * FROM availability_profiles WHERE id = ?').get(id);
  }

  return profile;
}

// Helper: Create slot
function createSlot(profileId, dayOfWeek, period, startTime, endTime, status = 'AVAILABLE') {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO availability_slots 
     (id, profileId, date, dayOfWeek, period, startTime, endTime, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, profileId, null, dayOfWeek, period, startTime, endTime, status);
  return id;
}

// Helper: Create override
function createOverride(profileId, date, startTime, endTime, status, notes = null) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO availability_overrides 
     (id, profileId, date, startTime, endTime, status, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, profileId, date, startTime, endTime, status, notes);
  return id;
}

console.log('🌱 Seeding Unified Availability Engine...');

// 1. Create community
const communityId = 'comm-demo-availability';
const communityExists = db.prepare('SELECT id FROM communities WHERE id = ?').get(communityId);
if (!communityExists) {
  db.prepare(
    `INSERT INTO communities (id, name, slug, description, visibility, type, createdBy, createdAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    communityId,
    'Demo Wellness Community',
    'demo-wellness',
    'A demo community for testing availability features',
    'public',
    'open',
    'demo-host-1'
  );
  console.log('✅ Created community:', communityId);
}

// 2. Create users (20 members, 2 facilitators, 1 host)
const users = [];
const userIds = [];

// Host
const hostId = 'demo-host-1';
const hostExists = db.prepare('SELECT id FROM users WHERE id = ?').get(hostId);
if (!hostExists) {
  db.prepare(
    `INSERT INTO users (id, email, fullName, passwordHash, role, createdAt) 
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).run(hostId, 'host@demo.com', 'Demo Host', 'hashed', 'host');
  userIds.push(hostId);
  console.log('✅ Created host:', hostId);
}

// Facilitators
for (let i = 1; i <= 2; i++) {
  const facId = `demo-facilitator-${i}`;
  const facExists = db.prepare('SELECT id FROM users WHERE id = ?').get(facId);
  if (!facExists) {
    db.prepare(
      `INSERT INTO users (id, email, fullName, passwordHash, role, createdAt) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).run(facId, `facilitator${i}@demo.com`, `Facilitator ${i}`, 'hashed', 'facilitator');
    userIds.push(facId);
    console.log('✅ Created facilitator:', facId);
  }
}

// Members
for (let i = 1; i <= 20; i++) {
  const memberId = `demo-member-${i}`;
  const memberExists = db.prepare('SELECT id FROM users WHERE id = ?').get(memberId);
  if (!memberExists) {
    db.prepare(
      `INSERT INTO users (id, email, fullName, passwordHash, role, createdAt) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).run(memberId, `member${i}@demo.com`, `Member ${i}`, 'hashed', 'user');
    userIds.push(memberId);
  }
}
console.log('✅ Created 20 members');

// 3. Create venues (2 venues owned by host)
const venues = [];
for (let i = 1; i <= 2; i++) {
  const venueId = `venue-demo-${i}`;
  const venueExists = db.prepare('SELECT id FROM places WHERE id = ?').get(venueId);
  if (!venueExists) {
    db.prepare(
      `INSERT INTO places (id, title, description, address, visibility, createdBy, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      venueId,
      `Demo Venue ${i}`,
      `A demo venue for testing availability`,
      `123 Demo St, Sydney`,
      'public',
      hostId
    );

    // Link host to venue
    db.prepare(
      `INSERT INTO place_hosts (id, placeId, userId, role, createdAt) 
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(randomUUID(), venueId, hostId, 'owner');

    venues.push(venueId);
    console.log('✅ Created venue:', venueId);
  }
}

// 4. Create availability profiles and slots for users
console.log('📅 Creating user availability...');

const periods = [
  { name: 'MORNING', start: '09:00', end: '12:00' },
  { name: 'AFTERNOON', start: '12:00', end: '17:00' },
  { name: 'EVENING', start: '17:00', end: '21:00' },
];

// Random availability for each user
userIds.forEach((userId, userIdx) => {
  const profile = getOrCreateProfile('USER', userId);

  // Each user has random availability (30-70% of time slots)
  const availabilityRate = 0.3 + Math.random() * 0.4; // 30-70%

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    periods.forEach((period) => {
      if (Math.random() < availabilityRate) {
        createSlot(profile.id, dayOfWeek, period.name, period.start, period.end, 'AVAILABLE');
      }
    });
  }

  // Add some random overrides (blocked dates)
  for (let i = 0; i < 2; i++) {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 30));
    const dateStr = date.toISOString().split('T')[0];
    createOverride(profile.id, dateStr, '00:00', '23:59', 'BLOCKED', 'Personal time');
  }
});

console.log(`✅ Created availability for ${userIds.length} users`);

// 5. Create venue availability profiles and slots
console.log('🏢 Creating venue availability...');

venues.forEach((venueId, venueIdx) => {
  const profile = getOrCreateProfile('VENUE', venueId);

  // Venue 1: Available weekdays 9am-5pm
  if (venueIdx === 0) {
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      // Monday-Friday
      createSlot(profile.id, dayOfWeek, 'CUSTOM', '09:00', '17:00', 'AVAILABLE');
    }
  } else {
    // Venue 2: Available weekends 10am-6pm
    createSlot(profile.id, 0, 'CUSTOM', '10:00', '18:00', 'AVAILABLE'); // Sunday
    createSlot(profile.id, 6, 'CUSTOM', '10:00', '18:00', 'AVAILABLE'); // Saturday
  }

  // Add some booked dates (overrides)
  for (let i = 0; i < 3; i++) {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 30));
    const dateStr = date.toISOString().split('T')[0];
    createOverride(profile.id, dateStr, '10:00', '14:00', 'BOOKED', `Event booking ${i + 1}`);
  }
});

console.log(`✅ Created availability for ${venues.length} venues`);

// 6. Link users to community (if community_members table exists)
// Note: Adjust based on your schema
try {
  db.prepare('CREATE TABLE IF NOT EXISTS community_members (id TEXT PRIMARY KEY, communityId TEXT, userId TEXT, role TEXT, createdAt TEXT DEFAULT (datetime("now")))').run();

  userIds.forEach((userId) => {
    const exists = db.prepare('SELECT id FROM community_members WHERE communityId = ? AND userId = ?').get(communityId, userId);
    if (!exists) {
      const role = userId === hostId ? 'owner' : userId.startsWith('demo-facilitator') ? 'facilitator' : 'member';
      db.prepare('INSERT INTO community_members (id, communityId, userId, role, createdAt) VALUES (?, ?, ?, ?, datetime("now"))').run(
        randomUUID(),
        communityId,
        userId,
        role
      );
    }
  });
  console.log('✅ Linked users to community');
} catch (err) {
  console.log('⚠️  Could not link users to community (table may not exist):', err.message);
}

console.log('\n✨ Seeding complete!');
console.log(`\n📊 Summary:`);
console.log(`   - Community: ${communityId}`);
console.log(`   - Users: ${userIds.length} (1 host, 2 facilitators, 20 members)`);
console.log(`   - Venues: ${venues.length}`);
console.log(`   - Availability profiles: ${db.prepare('SELECT COUNT(*) as count FROM availability_profiles').get().count}`);
console.log(`   - Availability slots: ${db.prepare('SELECT COUNT(*) as count FROM availability_slots').get().count}`);
console.log(`   - Availability overrides: ${db.prepare('SELECT COUNT(*) as count FROM availability_overrides').get().count}`);
