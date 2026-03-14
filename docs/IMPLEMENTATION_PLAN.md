# Implementation Plan - MVP Fixes & Enhancements

## Overview

This plan addresses four critical areas to make the MVP fully functional:
1. Fix Host Dashboard and Contact Form
2. Implement Demo Auth Mode
3. Implement Backend Endpoints
4. Implement MVP Requirements (Phase 1-7)

---

## TASK 1: Fix Host Dashboard and Contact Form

### 1.1 Host Dashboard Implementation

**Goal:** Replace placeholder with functional dashboard for hosts

**Requirements:**
- Display host's places, events, and bookings
- Show statistics (total bookings, upcoming events, etc.)
- Quick actions (create place, create event)
- Recent activity feed
- Booking management interface

**Implementation Steps:**
1. Create dashboard layout with stats cards
2. Fetch host's places, events, bookings
3. Display listings in organized sections
4. Add quick action buttons
5. Show booking statistics
6. Handle empty states gracefully

**Files to Modify:**
- `src/pages/HostDashboard.jsx` - Complete rewrite
- `src/api/places.js` - Ensure endpoints exist
- `src/api/events.js` - Ensure endpoints exist
- `src/api/bookings.js` - Ensure endpoints exist

**Mock Data:**
- Use existing mock data for display
- Fallback gracefully when API fails

---

### 1.2 Contact Form Implementation

**Goal:** Make contact form functional

**Requirements:**
- Form validation (already exists)
- Submit to backend endpoint
- Show success/error messages
- Handle submission state

**Implementation Steps:**
1. Create API endpoint function
2. Wire form submission
3. Add loading state
4. Show success message
5. Handle errors gracefully
6. Optionally: Add email service integration

**Files to Modify:**
- `src/pages/ContactUs.jsx` - Add submission logic
- `src/api/contact.js` - Create new API file
- `backend/routes/contact.js` - Create backend endpoint (if backend exists)

**Fallback:**
- If backend unavailable, show success message (simulated)
- Store in localStorage for later processing

---

## TASK 2: Implement Demo Auth Mode

### 2.1 Demo Authentication System

**Goal:** Allow testing without backend

**Requirements:**
- Demo login buttons (User/Host)
- Instant authentication
- Mock user data
- Persist in localStorage
- Seamless integration with existing auth

**Implementation Steps:**
1. Add demo mode toggle/buttons to Login page
2. Create demo user data
3. Implement demo login function
4. Update AuthContext to support demo mode
5. Ensure protected routes work with demo users
6. Add demo mode indicator

**Files to Modify:**
- `src/pages/Login.jsx` - Add demo buttons
- `src/contexts/AuthContext.jsx` - Add demo mode support
- `src/api/auth.js` - Add demo mode fallback
- `src/mocks/users.js` - Create demo user data

**Demo Users:**
- Demo User (role: 'user')
- Demo Host (role: 'host')
- Demo Admin (role: 'admin') - optional

---

## TASK 3: Implement Backend Endpoints

### 3.1 Events API

**Endpoints:**
- `GET /events` - List events with filters
- `GET /events/:id` - Get event detail
- `POST /events` - Create event
- `PATCH /events/:id` - Update event
- `DELETE /events/:id` - Delete event
- `POST /events/:id/approve` - Approve event (venue host)
- `POST /events/:id/publish` - Publish event (creator)

**Database Schema:**
```sql
CREATE TABLE events (
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
  proposed_by TEXT,
  venue_approved_at TEXT,
  createdBy TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);
```

**Files to Create:**
- `backend/routes/events.js`
- `backend/models/event.js` (optional)

---

### 3.2 Places API

**Endpoints:**
- `GET /places` - List places with filters
- `GET /places/:id` - Get place detail
- `POST /places` - Create place
- `PATCH /places/:id` - Update place
- `DELETE /places/:id` - Delete place
- `GET /places/:id/hosts` - List place hosts
- `POST /places/:id/hosts` - Add place host
- `DELETE /places/:id/hosts/:userId` - Remove place host

**Database Schema:**
```sql
CREATE TABLE places (
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
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE place_hosts (
  id TEXT PRIMARY KEY,
  placeId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT DEFAULT 'owner',
  createdAt TEXT DEFAULT (datetime('now')),
  UNIQUE(placeId, userId)
);
```

**Files to Create:**
- `backend/routes/places.js`
- `backend/models/place.js` (optional)

---

### 3.3 Bookings API

**Endpoints:**
- `GET /bookings` - List bookings with filters
- `GET /bookings/:id` - Get booking detail
- `POST /bookings` - Create booking
- `PATCH /bookings/:id` - Update booking
- `DELETE /bookings/:id` - Cancel booking

**Database Schema:**
```sql
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  eventId TEXT,
  userId TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);
```

**Validation:**
- Check event.status === 'published'
- Check capacity not exceeded
- Prevent duplicate bookings

**Files to Create:**
- `backend/routes/bookings.js`
- `backend/models/booking.js` (optional)

---

### 3.4 Messages API

**Endpoints:**
- `GET /messages?conversations=true` - List conversations
- `GET /messages?conversationId=:id` - Get conversation
- `POST /messages` - Send message or start conversation
- `PATCH /messages?conversationId=:id` - Mark as read

**Database Schema:**
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'dm' or 'contact'
  userId1 TEXT NOT NULL,
  userId2 TEXT NOT NULL,
  contextType TEXT, -- 'event', 'place', etc.
  contextId TEXT,
  contextTitle TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE conversation_reads (
  conversationId TEXT NOT NULL,
  userId TEXT NOT NULL,
  lastReadAt TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (conversationId, userId)
);
```

**Files to Create:**
- `backend/routes/messages.js`
- `backend/models/message.js` (optional)

---

### 3.5 Communities API

**Endpoints:**
- `GET /communities` - List communities
- `GET /communities/:slug` - Get community detail
- `POST /communities` - Create community
- `PATCH /communities/:slug` - Update community
- `DELETE /communities/:slug` - Delete community

**Database Schema:**
```sql
CREATE TABLE communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'public',
  type TEXT DEFAULT 'open',
  createdBy TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);
```

**Files to Create:**
- `backend/routes/communities.js`
- `backend/models/community.js` (optional)

---

### 3.6 Schedule & Counts API

**Endpoints:**
- `GET /user/profile?schedule=true` - Get user schedule
- `GET /me?counts=true` - Get navigation counts

**Implementation:**
- Aggregate events user created/facilitates/attends
- Count unread messages, upcoming events, etc.

**Files to Modify:**
- `backend/routes/users.js` - Add schedule endpoint
- `backend/routes/auth.js` - Add counts endpoint (or users.js)

---

## TASK 4: Implement MVP Requirements (Phase 1-7)

### 4.1 Phase 2: Event Model Upgrade

**Changes:**
- Add `status` field (default: 'proposed')
- Add `proposed_by` field
- Add `venue_approved_at` timestamp
- Migrate existing events to have status

**Database Migration:**
```sql
ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'proposed';
ALTER TABLE events ADD COLUMN proposed_by TEXT;
ALTER TABLE events ADD COLUMN venue_approved_at TEXT;
```

---

### 4.2 Phase 3: Availability Layer

**Tables:**
- `place_availability`
- `facilitator_availability`
- `member_availability`

**Endpoints:**
- CRUD for each availability type
- Query availability by date/time

---

### 4.3 Phase 4: Place Permission Layer

**Implementation:**
- Auto-add creator as owner on place creation
- Middleware to verify place host permission
- Approval endpoint checks permissions

---

### 4.4 Phase 5: Conflict Detection & Lifecycle

**Implementation:**
- Conflict detection function
- State transition validator
- Approval endpoint with conflict check
- Publish endpoint with state check
- Booking endpoint with status check

---

### 4.5 Phase 6: Frontend Coordination Flow

**Changes:**
- Update event creation flow
- Add status badges
- Show approve button (place hosts only)
- Show publish button (when allowed)
- Update booking UI to check status

---

### 4.6 Phase 7: Hardening

**Tasks:**
- Audit all transitions
- Ensure no bypasses
- Standardize errors
- Add indexes
- Fix console errors

---

## Implementation Order

1. ✅ **Task 1:** Fix Host Dashboard and Contact Form (STARTING NOW)
2. **Task 2:** Implement Demo Auth Mode
3. **Task 3:** Implement Backend Endpoints (incrementally)
4. **Task 4:** Implement MVP Requirements (phases 2-7)

---

## Success Criteria

### Task 1 Complete When:
- [ ] Host Dashboard shows real data
- [ ] Host Dashboard has functional UI
- [ ] Contact Form submits successfully
- [ ] Contact Form shows success/error states

### Task 2 Complete When:
- [ ] Demo login buttons work
- [ ] Demo users can access protected routes
- [ ] Demo mode persists across refreshes
- [ ] No backend required for demo mode

### Task 3 Complete When:
- [ ] All core endpoints implemented
- [ ] Data persists to database
- [ ] Validation works
- [ ] Error handling works

### Task 4 Complete When:
- [ ] Event lifecycle implemented
- [ ] Availability system works
- [ ] Conflict detection works
- [ ] Frontend reflects backend behavior

---

**Plan Created:** February 20, 2026  
**Status:** Ready to begin Task 1
