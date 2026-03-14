# Phase 1: Baseline Analysis & Gap Mapping

## Executive Summary

This is a **frontend-first application** with a minimal backend. The backend currently only implements authentication and user management. Events, bookings, places, and communities are handled via:
- Mock data on the frontend (`src/mocks/`)
- API client calls that expect backend endpoints (not yet implemented)
- Frontend components that assume certain data structures

**Key Finding**: The backend needs significant expansion to support the MVP requirements. Most event/booking logic exists only in frontend mocks.

---

## 1. Event Model Analysis

### Current State

**Frontend (`src/api/events.js`):**
- `createEvent(eventData)` - POST `/events`
- `getEvent(id)` - GET `/events?id=...`
- `getMyEvents()` - GET `/events?mine=true`
- `getPublicEvents(params)` - GET `/events` with filters
- `updateEvent(id, data)` - PATCH `/events?id=...`
- `deleteEvent(id)` - DELETE `/events?id=...`

**Frontend Event Form (`src/pages/HostEvent.jsx`):**
- Fields: `title`, `description`, `imageUrl`, `placeId`, `communityId`, `startAt`, `endAt`, `capacity`, `visibility`
- `visibility` enum: `'draft'`, `'unlisted'`, `'public'`
- **No status field** - events are created with visibility only
- **No proposed_by field**
- **No venue_approved_at field**

**Mock Event Structure (`src/mocks/events.js`):**
```javascript
{
  id, title, description, imageUrl,
  category, capacity, price,
  date, time, location, locationArea,
  host: { id, name },
  attendees, communityIds
}
```

**Current Assumptions:**
1. Events are created immediately (no approval workflow)
2. Events use `visibility` (`draft`/`unlisted`/`public`) not `status`
3. No lifecycle states (`proposed`, `venue_approved`, `published`)
4. Events can be booked immediately if `visibility === 'public'`

**Backend:**
- ❌ **No events table exists**
- ❌ **No events routes exist**
- ❌ **No event creation logic**

**Gap:**
- Need to create `events` table with: `id`, `title`, `description`, `imageUrl`, `placeId`, `communityId`, `startAt`, `endAt`, `capacity`, `visibility`, `createdBy`, `createdAt`
- Need to add: `status`, `proposed_by`, `venue_approved_at`
- Need to create `/events` routes (GET, POST, PATCH, DELETE)

---

## 2. Booking Logic Analysis

### Current State

**Frontend (`src/api/bookings.js`):**
- `createBooking(bookingData)` - POST `/bookings`
- `getMyBooking(scope)` - GET `/bookings?scope=...`
- `getBookingById(id)` - GET `/bookings?id=...`
- `updateBooking(id, data)` - PATCH `/bookings?id=...`
- `deleteBooking(id)` - DELETE `/bookings?id=...`
- `addEventAttendee(eventId, userId)` - POST `/bookings` with action

**Booking Creation (`src/pages/ListingDetail.jsx`):**
```javascript
createBooking({
  listingType: 'event',
  listingId: id,
  hostId: event.createdBy || null,
  startAt: event.startAt || null,
  endAt: event.endAt || null,
  notes: `Booking for ${event.title}`
})
```

**Current Assumptions:**
1. Bookings can be created for any event (no status check)
2. No capacity validation on frontend
3. No check for `event.status === 'published'`
4. Booking status: `'confirmed'`, `'pending'`, `'waitlist'`, `'cancelled'`

**Mock Booking Structure (`src/mocks/bookings.js`):**
```javascript
{
  id, listingType, listingId, userId,
  status, createdAt, startAt, endAt,
  notes, hostId
}
```

**Backend:**
- ❌ **No bookings table exists**
- ❌ **No bookings routes exist**
- ❌ **No booking validation logic**

**Gap:**
- Need to create `bookings` table
- Need to add validation: `event.status === 'published'` before booking
- Need to add capacity check
- Need to create `/bookings` routes

---

## 3. Place Ownership Model Analysis

### Current State

**Frontend (`src/api/places.js`):**
- `getMyPlaces()` - GET `/places?mine=true`
- `getPlacesInMyCommunities()` - GET `/places?scope=my-communities`
- `getPlace(id)` - GET `/places?id=...`
- `createPlace(placeData)` - POST `/places`
- `updatePlace(id, data)` - PATCH `/places?id=...`
- `deletePlace(id)` - DELETE `/places?id=...`

**Place Form (`src/pages/ListPlace.jsx`):**
- Fields: `title`, `description`, `address`, `lat`, `lng`, `communityId`, `visibility`, `imageUrl`
- `visibility` enum: `'draft'`, `'unlisted'`, `'public'`

**Current Assumptions:**
1. Place creator is implicitly the owner (no explicit `place_hosts` table)
2. No explicit permission model for place approval
3. No `place_hosts` table exists

**Backend:**
- ❌ **No places table exists**
- ❌ **No places routes exist**
- ❌ **No place_hosts table exists**

**Gap:**
- Need to create `places` table
- Need to create `place_hosts` table with: `placeId`, `userId`, `role` (`'owner'` or `'manager'`)
- Need to auto-add creator as owner on place creation
- Need to create `/places` routes
- Need middleware to check place host permissions

---

## 4. Publish Logic Analysis

### Current State

**Frontend:**
- Events use `visibility` field, not `status`
- `visibility: 'public'` means published
- No separate "publish" action - visibility is set on creation/update
- No approval step before publishing

**Current Flow:**
1. User creates event with `visibility: 'draft'` or `visibility: 'public'`
2. If `'public'`, event is immediately visible and bookable
3. No venue approval required

**Backend:**
- ❌ **No publish endpoint exists**
- ❌ **No approval endpoint exists**

**Gap:**
- Need to change from `visibility`-based to `status`-based lifecycle
- Need to add `/events/:id/approve` endpoint (place host only)
- Need to add `/events/:id/publish` endpoint (event creator only)
- Need to enforce: `proposed` → `venue_approved` → `published`

---

## 5. Schedule/Calendar Components Analysis

### Current State

**Frontend (`src/pages/MySchedule.jsx`):**
- Displays events user created, facilitates, or attends
- Shows: `title`, `startAt`, `placeTitle`, `role`, `status`
- Uses `getMySchedule()` - GET `/user/profile?schedule=true`

**Frontend (`src/pages/MyEvents.jsx`):**
- Displays events user hosts, facilitates, or attends
- Shows: `title`, `startAt`, `placeTitle`, `role`, `visibility` (mapped to status badge)
- Uses `getMyEvents()` - GET `/events?mine=true`

**Current Assumptions:**
1. Schedule shows events regardless of status
2. Status badge shows `visibility` value (`'public'` → "Published", `'unlisted'` → "Unlisted", `'draft'` → "Draft")
3. No distinction between lifecycle states

**Backend:**
- ❌ **No schedule endpoint exists**
- ❌ **No event status filtering**

**Gap:**
- Need to update schedule/events endpoints to return `status` instead of `visibility`
- Need to filter events by status appropriately
- Need to ensure status badges reflect new lifecycle states

---

## 6. Database Schema Gaps

### Missing Tables

1. **events**
   - Need: `id`, `title`, `description`, `imageUrl`, `placeId`, `communityId`, `startAt`, `endAt`, `capacity`, `status`, `proposed_by`, `venue_approved_at`, `createdBy`, `createdAt`, `updatedAt`

2. **bookings**
   - Need: `id`, `eventId`, `userId`, `status`, `createdAt`, `updatedAt`, `notes`

3. **places**
   - Need: `id`, `title`, `description`, `address`, `lat`, `lng`, `communityId`, `visibility`, `imageUrl`, `createdBy`, `createdAt`, `updatedAt`

4. **place_hosts**
   - Need: `id`, `placeId`, `userId`, `role`, `createdAt`

5. **place_availability** (new for MVP)
   - Need: `id`, `placeId`, `date`, `startTime`, `endTime`, `createdAt`

6. **facilitator_availability** (new for MVP)
   - Need: `id`, `userId`, `date`, `startTime`, `endTime`, `createdAt`

7. **member_availability** (new for MVP)
   - Need: `id`, `userId`, `communityId`, `date`, `createdAt`

---

## 7. API Endpoint Gaps

### Missing Endpoints

**Events:**
- GET `/events` (list with filters)
- GET `/events/:id` (detail)
- POST `/events` (create as `proposed`)
- PATCH `/events/:id` (update)
- DELETE `/events/:id` (delete)
- POST `/events/:id/approve` (venue approval - NEW)
- POST `/events/:id/publish` (publish - NEW)
- GET `/events/availability` (check availability - NEW)

**Bookings:**
- GET `/bookings` (list with filters)
- GET `/bookings/:id` (detail)
- POST `/bookings` (create - must check `event.status === 'published'`)
- PATCH `/bookings/:id` (update)
- DELETE `/bookings/:id` (delete)

**Places:**
- GET `/places` (list with filters)
- GET `/places/:id` (detail)
- POST `/places` (create - auto-add creator as owner)
- PATCH `/places/:id` (update)
- DELETE `/places/:id` (delete)

**Place Hosts:**
- GET `/places/:id/hosts` (list hosts)
- POST `/places/:id/hosts` (add host)
- DELETE `/places/:id/hosts/:userId` (remove host)

**Availability:**
- GET `/availability/places` (list place availability)
- POST `/availability/places` (create place availability)
- DELETE `/availability/places/:id` (delete)
- GET `/availability/facilitators` (list facilitator availability)
- POST `/availability/facilitators` (create facilitator availability)
- DELETE `/availability/facilitators/:id` (delete)
- GET `/availability/members` (list member availability)
- POST `/availability/members` (create member availability)
- DELETE `/availability/members/:id` (delete)

---

## 8. Frontend Component Gaps

### Components Needing Updates

1. **`src/pages/HostEvent.jsx`**
   - Change from `visibility` to `status: 'proposed'` on creation
   - Add date selection step
   - Add availability fetching step
   - Add place/facilitator selection based on availability

2. **`src/pages/MyEvents.jsx`**
   - Update status badge to show lifecycle states (`proposed`, `venue_approved`, `published`)
   - Add approve button (for place hosts)
   - Add publish button (for event creator, when `status === 'venue_approved'`)

3. **`src/pages/ListingDetail.jsx`**
   - Add status check before allowing booking (`status === 'published'`)
   - Show status badge
   - Hide booking button if not published

4. **`src/pages/MySchedule.jsx`**
   - Update to use `status` instead of `visibility`

---

## 9. Critical Assumptions to Validate

1. ✅ Events currently have no approval workflow (confirmed - uses `visibility` only)
2. ✅ Bookings are not gated by event status (confirmed - no status check)
3. ✅ Place ownership is implicit (confirmed - no `place_hosts` table)
4. ✅ No conflict detection exists (confirmed - no overlap checking)
5. ✅ No availability system exists (confirmed - no availability tables)

---

## 10. Implementation Readiness

### Backend Readiness: **LOW**
- Only auth/user tables exist
- Need to create 7 new tables
- Need to create ~30+ new API endpoints
- Need to implement conflict detection
- Need to implement state machine validation

### Frontend Readiness: **MEDIUM**
- Components exist but assume different data model
- Need to update event creation flow
- Need to add approval/publish UI
- Need to update status displays
- Need to add availability selection UI

### Risk Assessment: **MEDIUM-HIGH**
- Significant backend work required
- Frontend needs refactoring to match new lifecycle
- Need to ensure backward compatibility with existing mocks during transition

---

## Next Steps (Phase 2)

1. Create `events` table with `status`, `proposed_by`, `venue_approved_at`
2. Create events routes (GET, POST, PATCH, DELETE)
3. Update frontend to use `status` instead of `visibility` for events
4. Ensure all new events default to `status = 'proposed'`
5. Verify no existing queries break

---

**Analysis Complete - Ready for Phase 2**
