# Backend Quick Start Guide

## Setup

```bash
cd backend
npm install
```

## Run Seed Data

```bash
npm run seed
```

This creates:
- 10 test users (admin, 2 hosts, 2 facilitators, 5 members)
- 2 places with hosts
- 4 events in different states
- Availability records
- Bookings

**All passwords:** `password123`

## Start Server

```bash
npm start
# or for development with watch:
npm run dev
```

Server runs on `http://localhost:5000`

## Test Accounts

- **Admin:** `admin@example.com` / `password123`
- **Host 1:** `host1@example.com` / `password123` (owns Place A)
- **Host 2:** `host2@example.com` / `password123` (owns Place B)
- **Member 1:** `member1@example.com` / `password123`

## Test Scenarios

### 1. Create Event (as Member 1)
```bash
POST /events
Authorization: Bearer <token>
{
  "title": "Test Workshop",
  "placeId": "<place1-id>",
  "startAt": "2025-02-15T10:00:00Z",
  "endAt": "2025-02-15T12:00:00Z",
  "capacity": 20
}
```
Result: Event created with `status: "proposed"`

### 2. Approve Event (as Host 1)
```bash
POST /events/<event-id>/approve
Authorization: Bearer <host1-token>
```
Result: Event status becomes `venue_approved`

### 3. Publish Event (as Member 1 - creator)
```bash
POST /events/<event-id>/publish
Authorization: Bearer <member1-token>
```
Result: Event status becomes `published`

### 4. Book Event (as any user)
```bash
POST /bookings
Authorization: Bearer <token>
{
  "eventId": "<published-event-id>"
}
```
Result: Booking created (if capacity available)

### 5. Test Conflict
Try to approve an event that overlaps with Event 3 or Event 4.
Result: Should fail with conflict error

## API Endpoints

See `docs/BACKEND_IMPLEMENTATION_SUMMARY.md` for full API documentation.
