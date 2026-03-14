/**
 * Development-only seed script.
 * Run: npx tsx scripts/seed-dev.ts
 * Guard: never runs in production.
 */
if (process.env.NODE_ENV === 'production') {
  console.error('Seed script is disabled in production.');
  process.exit(1);
}

import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../server-lib/auth';

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  await initDb();

  const vikEmail = 'vik@dev.local';
  let vikId: string;

  const existing = await sql`SELECT id FROM users WHERE email = ${vikEmail}`;
  if (existing.length > 0) {
    vikId = (existing[0] as { id: string }).id;
    await sql`UPDATE users SET "fullName" = 'Vik Nithy', trust_tier = 'verified', role = 'admin' WHERE id = ${vikId}`;
    console.log('Updated existing user Vik Nithy (admin)');
  } else {
    vikId = crypto.randomUUID();
    const passwordHash = await hashPassword('dev123456');
    await sql`
      INSERT INTO users (id, email, "fullName", "passwordHash", role, trust_tier, locale)
      VALUES (${vikId}, ${vikEmail}, 'Vik Nithy', ${passwordHash}, 'admin', 'verified', 'en')
    `;
    console.log('Created admin user Vik Nithy (vik@dev.local / dev123456)');
  }

  // Community: Local Spirit
  let communityId: string;
  const communityExists = await sql`SELECT id FROM communities WHERE slug = 'local-spirit'`;
  if (communityExists.length === 0) {
    communityId = crypto.randomUUID();
    await sql`
      INSERT INTO communities (id, name, slug, description, visibility, "createdBy", "codeOfConduct", tags, "joinApproval")
      VALUES (${communityId}, 'Local Spirit', 'local-spirit', 'A community for meditation and connection.', 'public', ${vikId}, 'Be respectful. Honor each other''s journey.', '["meditation", "wellness", "community"]'::jsonb, 'auto')
    `;
    await sql`
      INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
      VALUES (${crypto.randomUUID()}, 'community', ${communityId}, ${vikId}, 'owner')
    `;
    console.log('Created community: Local Spirit');
  } else {
    communityId = (communityExists[0] as { id: string }).id;
    await sql`
      UPDATE communities SET "codeOfConduct" = COALESCE("codeOfConduct", 'Be respectful. Honor each other''s journey.'), tags = COALESCE(tags, '["meditation", "wellness", "community"]'::jsonb), "joinApproval" = COALESCE("joinApproval", 'auto') WHERE id = ${communityId}
    `;
  }

  // Place 1: Community Hall – Baulkham Hills
  let place1Id: string;
  const place1Exists = await sql`SELECT id FROM places WHERE title = 'Community Hall – Baulkham Hills'`;
  if (place1Exists.length === 0) {
    place1Id = crypto.randomUUID();
    await sql`
      INSERT INTO places (id, title, description, address, "communityId", visibility, lat, lng, "createdBy")
      VALUES (${place1Id}, 'Community Hall – Baulkham Hills', 'A welcoming community space for gatherings.', 'Baulkham Hills, NSW', ${communityId}, 'public', -33.7589, 150.9929, ${vikId})
    `;
    console.log('Created place: Community Hall – Baulkham Hills');
  } else {
    place1Id = (place1Exists[0] as { id: string }).id;
    await sql`UPDATE places SET "communityId" = ${communityId}, lat = -33.7589, lng = 150.9929 WHERE id = ${place1Id}`;
    console.log('Place Community Hall already exists (linked to community)');
  }
  // Ensure membership exists
  const mem1Exists = await sql`SELECT id FROM object_memberships WHERE "objectType" = 'place' AND "objectId" = ${place1Id} AND "userId" = ${vikId}`;
  if (mem1Exists.length === 0) {
    await sql`
      INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
      VALUES (${crypto.randomUUID()}, 'place', ${place1Id}, ${vikId}, 'owner')
    `;
    console.log('Created membership for Community Hall');
  }

  // Place 2: Backyard Meditation Space
  let place2Id: string;
  const place2Exists = await sql`SELECT id FROM places WHERE title = 'Backyard Meditation Space'`;
  if (place2Exists.length === 0) {
    place2Id = crypto.randomUUID();
    await sql`
      INSERT INTO places (id, title, description, address, "communityId", visibility, lat, lng, "createdBy")
      VALUES (${place2Id}, 'Backyard Meditation Space', 'A peaceful backyard space for meditation.', null, ${communityId}, 'unlisted', -33.7589, 150.9929, ${vikId})
    `;
    console.log('Created place: Backyard Meditation Space');
  } else {
    place2Id = (place2Exists[0] as { id: string }).id;
    await sql`UPDATE places SET "communityId" = ${communityId}, lat = -33.7589, lng = 150.9929 WHERE id = ${place2Id}`;
    console.log('Place Backyard Meditation Space already exists (linked to community)');
  }
  // Ensure membership exists
  const mem2Exists = await sql`SELECT id FROM object_memberships WHERE "objectType" = 'place' AND "objectId" = ${place2Id} AND "userId" = ${vikId}`;
  if (mem2Exists.length === 0) {
    await sql`
      INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
      VALUES (${crypto.randomUUID()}, 'place', ${place2Id}, ${vikId}, 'owner')
    `;
    console.log('Created membership for Backyard Meditation Space');
  }

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(18, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(20, 0, 0, 0);

  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
  inTwoWeeks.setHours(10, 0, 0, 0);
  const inTwoWeeksEnd = new Date(inTwoWeeks);
  inTwoWeeksEnd.setHours(12, 0, 0, 0);

  // Event 1: Evening Meditation Circle
  let ev1Id: string;
  const ev1Exists = await sql`SELECT id FROM events WHERE title = 'Evening Meditation Circle'`;
  if (ev1Exists.length === 0) {
    ev1Id = crypto.randomUUID();
    await sql`
      INSERT INTO events (id, title, description, "placeId", "communityId", "startAt", "endAt", capacity, visibility, "createdBy")
      VALUES (${ev1Id}, 'Evening Meditation Circle', 'A weekly meditation circle.', ${place1Id}, ${communityId}, ${nextWeek.toISOString()}, ${nextWeekEnd.toISOString()}, 20, 'public', ${vikId})
    `;
    console.log('Created event: Evening Meditation Circle');
  } else {
    ev1Id = (ev1Exists[0] as { id: string }).id;
    await sql`UPDATE events SET "communityId" = ${communityId} WHERE id = ${ev1Id}`;
    console.log('Event Evening Meditation Circle already exists (linked to community)');
  }
  // Ensure membership exists
  const memEv1Exists = await sql`SELECT id FROM object_memberships WHERE "objectType" = 'event' AND "objectId" = ${ev1Id} AND "userId" = ${vikId}`;
  if (memEv1Exists.length === 0) {
    await sql`
      INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
      VALUES (${crypto.randomUUID()}, 'event', ${ev1Id}, ${vikId}, 'owner')
    `;
    console.log('Created membership for Evening Meditation Circle');
  }

  // Event 2: Small Group Satsang
  let ev2Id: string;
  const ev2Exists = await sql`SELECT id FROM events WHERE title = 'Small Group Satsang'`;
  if (ev2Exists.length === 0) {
    ev2Id = crypto.randomUUID();
    await sql`
      INSERT INTO events (id, title, description, "placeId", "communityId", "startAt", "endAt", capacity, visibility, "createdBy")
      VALUES (${ev2Id}, 'Small Group Satsang', 'An intimate satsang gathering.', ${place2Id}, ${communityId}, ${inTwoWeeks.toISOString()}, ${inTwoWeeksEnd.toISOString()}, 8, 'unlisted', ${vikId})
    `;
    console.log('Created event: Small Group Satsang');
  } else {
    ev2Id = (ev2Exists[0] as { id: string }).id;
    await sql`UPDATE events SET "communityId" = ${communityId} WHERE id = ${ev2Id}`;
    console.log('Event Small Group Satsang already exists (linked to community)');
  }
  // Ensure membership exists
  const memEv2Exists = await sql`SELECT id FROM object_memberships WHERE "objectType" = 'event' AND "objectId" = ${ev2Id} AND "userId" = ${vikId}`;
  if (memEv2Exists.length === 0) {
    await sql`
      INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
      VALUES (${crypto.randomUUID()}, 'event', ${ev2Id}, ${vikId}, 'owner')
    `;
    console.log('Created membership for Small Group Satsang');
  }

  // Dummy users in Local Spirit community with bookings on events
  const dummyUsers = [
    { name: 'Sam Chen', email: 'sam@dev.local', bio: 'Yoga enthusiast and meditation practitioner.' },
    { name: 'Marcus Rodriguez', email: 'marcus@dev.local', bio: 'Community organizer and satsang regular.' },
    { name: 'Jordan Lee', email: 'jordan@dev.local', bio: 'Exploring mindfulness and connection.' },
    { name: 'Aisha Patel', email: 'aisha@dev.local', bio: 'New to the community, excited to learn.' },
  ];

  const dummyPasswordHash = await hashPassword('dev123456');
  const dummyIds: string[] = [];

  for (const d of dummyUsers) {
    let uid: string;
    const exists = await sql`SELECT id FROM users WHERE email = ${d.email}`;
    if (exists.length > 0) {
      uid = (exists[0] as { id: string }).id;
      await sql`UPDATE users SET "fullName" = ${d.name}, bio = ${d.bio} WHERE id = ${uid}`;
      console.log(`Updated dummy user: ${d.name}`);
    } else {
      uid = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, email, "fullName", "passwordHash", role, bio, locale)
        VALUES (${uid}, ${d.email}, ${d.name}, ${dummyPasswordHash}, 'user', ${d.bio}, 'en')
      `;
      console.log(`Created dummy user: ${d.name}`);
    }
    dummyIds.push(uid);

    const memExists = await sql`SELECT id FROM object_memberships WHERE "objectType" = 'community' AND "objectId" = ${communityId} AND "userId" = ${uid}`;
    if (memExists.length === 0) {
      await sql`
        INSERT INTO object_memberships (id, "objectType", "objectId", "userId", role)
        VALUES (${crypto.randomUUID()}, 'community', ${communityId}, ${uid}, 'viewer')
      `;
      console.log(`  -> Added ${d.name} to Local Spirit`);
    }
  }

  // Bookings: Sam, Marcus, Jordan on Evening Meditation; Marcus, Jordan, Aisha on Small Group Satsang
  const bookings: { userId: string; eventId: string; startAt: Date; endAt: Date }[] = [
    { userId: dummyIds[0], eventId: ev1Id, startAt: nextWeek, endAt: nextWeekEnd },
    { userId: dummyIds[1], eventId: ev1Id, startAt: nextWeek, endAt: nextWeekEnd },
    { userId: dummyIds[2], eventId: ev1Id, startAt: nextWeek, endAt: nextWeekEnd },
    { userId: dummyIds[1], eventId: ev2Id, startAt: inTwoWeeks, endAt: inTwoWeeksEnd },
    { userId: dummyIds[2], eventId: ev2Id, startAt: inTwoWeeks, endAt: inTwoWeeksEnd },
    { userId: dummyIds[3], eventId: ev2Id, startAt: inTwoWeeks, endAt: inTwoWeeksEnd },
  ];

  for (const b of bookings) {
    const exists = await sql`
      SELECT id FROM bookings
      WHERE "userId" = ${b.userId} AND "listingType" = 'event' AND "listingId" = ${b.eventId}
    `;
    if (exists.length === 0) {
      await sql`
        INSERT INTO bookings (id, "userId", "hostId", "listingType", "listingId", status, "startAt", "endAt")
        VALUES (${crypto.randomUUID()}, ${b.userId}, ${vikId}, 'event', ${b.eventId}, 'confirmed', ${b.startAt.toISOString()}, ${b.endAt.toISOString()})
      `;
    }
  }
  console.log('Created dummy bookings for events');

  console.log('Seed complete.');
}

async function initDb() {
  const { initDb } = await import('../server-lib/db');
  await initDb();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
