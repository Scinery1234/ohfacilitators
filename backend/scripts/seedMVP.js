/**
 * Seed script for MVP testing data
 * Creates realistic test scenarios for development and testing
 * 
 * Run with: npm run seed (from backend directory)
 * Or: node scripts/seedMVP.js (from backend directory)
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '../ohfacilitators.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

function generateId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

function now() {
  return new Date().toISOString();
}

async function seed() {
  console.log('🌱 Starting MVP seed...');

  // Clear existing data (idempotent)
  console.log('Clearing existing data...');
  db.exec(`
    DELETE FROM bookings;
    DELETE FROM events;
    DELETE FROM place_availability;
    DELETE FROM facilitator_availability;
    DELETE FROM member_availability;
    DELETE FROM place_hosts;
    DELETE FROM places;
    DELETE FROM communities;
    DELETE FROM users WHERE id NOT LIKE 'demo-%';
  `);

  // 1. Users
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminId = generateId();
  const host1Id = generateId();
  const host2Id = generateId();
  const facilitator1Id = generateId();
  const facilitator2Id = generateId();
  const memberIds = Array.from({ length: 5 }, () => generateId());

  const users = [
    { id: adminId, email: 'admin@example.com', fullName: 'Admin User', role: 'admin' },
    { id: host1Id, email: 'host1@example.com', fullName: 'Place Host One', role: 'host' },
    { id: host2Id, email: 'host2@example.com', fullName: 'Place Host Two', role: 'host' },
    { id: facilitator1Id, email: 'facilitator1@example.com', fullName: 'Facilitator One', role: 'user' },
    { id: facilitator2Id, email: 'facilitator2@example.com', fullName: 'Facilitator Two', role: 'user' },
    ...memberIds.map((id, i) => ({
      id,
      email: `member${i + 1}@example.com`,
      fullName: `Member ${i + 1}`,
      role: 'user',
    })),
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (id, email, fullName, passwordHash, role) VALUES (?, ?, ?, ?, ?)'
  );

  for (const user of users) {
    insertUser.run(user.id, user.email, user.fullName, passwordHash, user.role);
  }

  console.log(`✅ Created ${users.length} users`);

  // 2. Places
  console.log('Creating places...');
  const place1Id = generateId();
  const place2Id = generateId();

  const places = [
    {
      id: place1Id,
      title: 'Cozy Art Studio',
      description: 'Bright studio space perfect for workshops and creative events',
      address: '123 Art Street, Sydney CBD',
      lat: -33.8688,
      lng: 151.2093,
      createdBy: host1Id,
    },
    {
      id: place2Id,
      title: 'Yoga & Meditation Room',
      description: 'Peaceful space for wellness activities',
      address: '456 Wellness Ave, Inner West',
      lat: -33.8945,
      lng: 151.1784,
      createdBy: host2Id,
    },
  ];

  const insertPlace = db.prepare(
    `INSERT INTO places (id, title, description, address, lat, lng, visibility, createdBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const place of places) {
    insertPlace.run(
      place.id,
      place.title,
      place.description,
      place.address,
      place.lat,
      place.lng,
      'public',
      place.createdBy,
      now(),
      now()
    );
  }

  // Create place_hosts (auto-owners)
  const insertPlaceHost = db.prepare('INSERT INTO place_hosts (id, placeId, userId, role) VALUES (?, ?, ?, ?)');
  insertPlaceHost.run(generateId(), place1Id, host1Id, 'owner');
  insertPlaceHost.run(generateId(), place2Id, host2Id, 'owner');

  console.log(`✅ Created ${places.length} places`);

  // 3. Availability
  console.log('Creating availability...');
  const availabilityDate = '2025-01-30';

  // Place availability
  const insertPlaceAvail = db.prepare(
    'INSERT INTO place_availability (id, placeId, date, startTime, endTime) VALUES (?, ?, ?, ?, ?)'
  );
  insertPlaceAvail.run(generateId(), place1Id, availabilityDate, '10:00:00', '12:00:00');
  insertPlaceAvail.run(generateId(), place2Id, availabilityDate, '10:00:00', '12:00:00');

  // Facilitator availability
  const insertFacilitatorAvail = db.prepare(
    'INSERT INTO facilitator_availability (id, userId, date, startTime, endTime) VALUES (?, ?, ?, ?, ?)'
  );
  insertFacilitatorAvail.run(generateId(), facilitator1Id, availabilityDate, '09:00:00', '17:00:00');
  insertFacilitatorAvail.run(generateId(), facilitator2Id, availabilityDate, '10:00:00', '14:00:00');

  // Member availability (3 members)
  const insertMemberAvail = db.prepare(
    'INSERT INTO member_availability (id, userId, date) VALUES (?, ?, ?)'
  );
  for (let i = 0; i < 3; i++) {
    insertMemberAvail.run(generateId(), memberIds[i], availabilityDate);
  }

  console.log('✅ Created availability records');

  // 4. Events
  console.log('Creating events...');
  const event1Id = generateId(); // proposed
  const event2Id = generateId(); // venue_approved
  const event3Id = generateId(); // published
  const event4Id = generateId(); // published (for conflict testing)

  const events = [
    {
      id: event1Id,
      title: 'Proposed Art Workshop',
      description: 'A workshop that needs approval',
      placeId: place1Id,
      startAt: '2025-02-01T10:00:00Z',
      endAt: '2025-02-01T12:00:00Z',
      capacity: 15,
      status: 'proposed',
      proposed_by: memberIds[0],
      createdBy: memberIds[0],
    },
    {
      id: event2Id,
      title: 'Approved Yoga Session',
      description: 'Ready to be published',
      placeId: place2Id,
      startAt: '2025-02-05T10:00:00Z',
      endAt: '2025-02-05T11:00:00Z',
      capacity: 20,
      status: 'venue_approved',
      proposed_by: memberIds[1],
      venue_approved_at: now(),
      createdBy: memberIds[1],
    },
    {
      id: event3Id,
      title: 'Published Meditation Circle',
      description: 'Open for bookings',
      placeId: place1Id,
      startAt: '2025-02-10T10:00:00Z',
      endAt: '2025-02-10T11:30:00Z',
      capacity: 12,
      status: 'published',
      proposed_by: memberIds[2],
      venue_approved_at: now(),
      createdBy: memberIds[2],
    },
    {
      id: event4Id,
      title: 'Overlapping Event (Conflict Test)',
      description: 'This overlaps with event 3 for conflict testing',
      placeId: place1Id,
      startAt: '2025-02-10T10:30:00Z', // Overlaps with event3
      endAt: '2025-02-10T12:00:00Z',
      capacity: 10,
      status: 'published',
      proposed_by: memberIds[3],
      venue_approved_at: now(),
      createdBy: memberIds[3],
    },
  ];

  const insertEvent = db.prepare(
    `INSERT INTO events (
      id, title, description, placeId, startAt, endAt, capacity,
      status, proposed_by, venue_approved_at, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const event of events) {
    insertEvent.run(
      event.id,
      event.title,
      event.description,
      event.placeId,
      event.startAt,
      event.endAt,
      event.capacity,
      event.status,
      event.proposed_by,
      event.venue_approved_at || null,
      event.createdBy,
      now(),
      now()
    );
  }

  console.log(`✅ Created ${events.length} events`);

  // 5. Bookings
  console.log('Creating bookings...');
  const insertBooking = db.prepare(
    'INSERT INTO bookings (id, eventId, userId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
  );

  // Add bookings up to capacity for event3
  for (let i = 0; i < 8; i++) {
    insertBooking.run(generateId(), event3Id, memberIds[i % memberIds.length], 'confirmed', now(), now());
  }

  // Add a few pending bookings
  insertBooking.run(generateId(), event3Id, memberIds[0], 'pending', now(), now());

  console.log('✅ Created bookings');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nTest accounts:');
  console.log('  Admin: admin@example.com / password123');
  console.log('  Host 1: host1@example.com / password123');
  console.log('  Host 2: host2@example.com / password123');
  console.log('  Member 1: member1@example.com / password123');
  console.log('\nEvent IDs for testing:');
  console.log(`  Proposed: ${event1Id}`);
  console.log(`  Approved: ${event2Id}`);
  console.log(`  Published: ${event3Id}`);
  console.log(`  Conflict test: ${event4Id}`);
}

seed()
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed error:', err);
    db.close();
    process.exit(1);
  });
