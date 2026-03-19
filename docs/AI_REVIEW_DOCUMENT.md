# AI Review Document: ohfacilitators Application

**Prepared for:** Claude AI Architectural Review
**Date:** March 2026
**Purpose:** Assess the current application structure against strategic vision and user requirements, and provide actionable feedback.

---

## HOW TO USE THIS DOCUMENT

This document is structured for an AI reviewer to:
1. Understand the **strategic vision** of what we're building
2. Understand the **user requirements** at each role level
3. Review a **snapshot of the current implementation state**
4. Identify **gaps, misalignments, and risks**
5. Provide **prioritised, actionable recommendations**

Please read each section in order. Key tension areas are flagged with ⚠️.

---

## PART 1: STRATEGIC VISION

### What is ohfacilitators?

ohfacilitators is a community marketplace connecting three types of participants:

| Role | Who They Are | Core Need |
|------|-------------|-----------|
| **Member/User** | Community participants, learners, movers, creators | Find and book meaningful experiences |
| **Host** | Space owners or managers | List venues, approve events, manage bookings |
| **Facilitator** | Workshop leaders, coaches, instructors | Offer skills, get booked, coordinate availability |

### Core Value Proposition

> "Find a space. Book an experience. Build community."

The platform bridges the gap between:
- **Spaces** (venues with availability)
- **Events** (experiences needing approval + participants)
- **Facilitators** (skilled individuals with schedules)
- **Communities** (groups organising together)

### The Five Activity Categories

Events and spaces are organised under five lifestyle categories:

- **CREATE** — art, craft, making
- **MOVE** — yoga, dance, fitness
- **CELEBRATE** — parties, gatherings
- **LEARN** — workshops, classes, talks
- **RELAX** — wellness, meditation, restorative

### User Journey Flows

**Public Visitor → Member:**
```
Browse (no auth) → Explore events/spaces → Register → Book event
```

**Member → Host:**
```
Register → Submit Host Application → Admin Reviews → Approved → Manage Listings
```

**Host Workflow:**
```
List Place → Set Availability → Receive Event Proposals → Approve/Reject → Manage Bookings
```

**Facilitator Workflow:**
```
Create Profile → Set Availability → Create/Propose Events at Venues → Get Booked
```

**Event Lifecycle:**
```
Proposed (by facilitator/member) → Venue Approved (by host) → Published (by creator) → Bookable
```

---

## PART 2: USER REQUIREMENTS

### 2.1 Unauthenticated (Public) Users

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Browse all public events | Must Have | Without login |
| Browse all public spaces/venues | Must Have | Without login |
| Browse facilitators | Must Have | Profile cards |
| Browse communities | Must Have | Public communities |
| View event detail | Must Have | Including host info |
| View space/venue detail | Must Have | Including availability hint |
| View facilitator profile | Must Have | Bio, specialties |
| Register (become member) | Must Have | Email + password |
| Navigate by category (CREATE, MOVE, etc.) | Should Have | Filtering |
| Search / filter events | Should Have | By date, category, location |

### 2.2 Authenticated Members

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Login / logout | Must Have | JWT auth |
| View and edit profile | Must Have | Name, bio, avatar |
| Book a published event | Must Have | Atomic, capacity-checked |
| View my bookings | Must Have | Status-aware |
| View my schedule | Must Have | Upcoming bookings + events |
| Message hosts / facilitators | Should Have | Basic DM |
| Mark my availability | Should Have | For community scheduling |
| Join a community | Should Have | Public communities |
| Apply to become a host | Should Have | Admin-reviewed form |

### 2.3 Hosts

| Requirement | Priority | Notes |
|-------------|----------|-------|
| All member capabilities | Must Have | |
| Create and manage venues (places) | Must Have | Title, desc, address, images |
| Set venue availability | Must Have | Calendar-based |
| Receive and review event proposals | Must Have | Approve/reject |
| View booking list for venue events | Must Have | Names, counts |
| Host Dashboard (overview) | Must Have | Stats + quick actions |
| Manage co-hosts for a venue | Should Have | Multi-host support |

### 2.4 Facilitators

| Requirement | Priority | Notes |
|-------------|----------|-------|
| All member capabilities | Must Have | |
| Create a facilitator profile | Must Have | Skills, bio, photo |
| Set personal availability | Must Have | Weekly hours + overrides |
| Create / propose events at venues | Must Have | Linked to place |
| Manage my events | Must Have | Edit, cancel, publish |
| View my event bookings | Must Have | Who booked |

### 2.5 Admins

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Review host applications | Must Have | Approve/reject |
| Manage users | Should Have | Roles, suspension |
| Moderate content | Should Have | Remove listings |
| View platform analytics | Nice to Have | Bookings, signups |

---

## PART 3: CURRENT IMPLEMENTATION SNAPSHOT

### 3.1 Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19 + Vite 7 | Modern, well-chosen |
| Routing | React Router v7 | With loader functions |
| Styling | Tailwind CSS v4 | Custom design system (burgundy/cream) |
| Forms | React Hook Form + Zod | Consistent validation |
| HTTP | Axios | JWT interceptor configured |
| Backend | Express.js on Node | REST API |
| Database | SQLite (better-sqlite3) | Single-file DB |
| Auth | JWT + bcryptjs | Standard approach |
| Deployment | Vercel (frontend) | Serverless functions |
| Maps | Leaflet + React Leaflet | Venue map display |
| Testing | Vitest + React Testing Library | Component + integration tests |

### 3.2 Database Schema (13 Tables)

```
users               — accounts, roles (user/host/admin)
places              — venues (lat/lng, visibility, image)
place_hosts         — many-to-many host ↔ place
events              — lifecycle status (proposed/venue_approved/published)
bookings            — event bookings, status tracking
place_availability  — legacy availability slots (date+time)
facilitator_availability — legacy availability slots
member_availability — community scheduling availability
communities         — groups (type, visibility)
community_members   — membership join table
availability_profiles — unified availability engine (USER|VENUE)
availability_slots  — recurring slot definitions
availability_overrides — blocked/booked time exceptions
```

### 3.3 Frontend Pages (36 total)

**Public:**
Home, Explore, About, FAQ, Contact Us, Privacy Policy, Terms, Safety & Trust, Community Guidelines, Not Found

**Auth:**
Login, Register, BecomeHost

**Member (protected):**
Dashboard, Profile, MyBookings, MySchedule, Messages

**Host (protected):**
HostDashboard, HostDetail, MyPlaces, ListPlace, PlaceEdit, PlaceDetail

**Events:**
HostEvent, FacilitateEvent, MyEvents, ListingDetail

**Communities:**
Communities, CommunityDetail, CommunityEdit, StartCommunity, MyCommunities

**Facilitator:**
FacilitatorDetail, VenueDetail

### 3.4 Backend Routes Implemented

```
POST   /auth/register
POST   /auth/login
GET    /users/me
GET    /user/profile?schedule=true
GET    /me?counts=true

GET/POST/PATCH/DELETE  /events
POST   /events/:id/approve         (atomic, conflict-checked)
POST   /events/:id/publish
POST   /events/:id/cancel

GET/POST/PATCH/DELETE  /places
GET/POST/DELETE        /places/:id/hosts

GET/POST/PATCH/DELETE  /bookings   (atomic, capacity-checked)

GET/POST/DELETE        /availability/places
GET/POST/DELETE        /availability/facilitators
GET/POST/DELETE        /availability/members

GET    /api/availability/profiles/:ownerId
POST   /api/availability/profiles
GET/POST/PUT/DELETE    /api/availability/slots
GET/POST/DELETE        /api/availability/overrides
GET    /api/availability/conflicts

POST   /api/scheduling/suggest-time
GET    /api/scheduling/availability-snapshot
```

### 3.5 Known Current State (as of latest task completion)

| Area | Status | Notes |
|------|--------|-------|
| Frontend UI (all pages) | ✅ Built | All 36 pages render |
| Navigation & routing | ✅ Working | 38+ routes configured |
| Demo mode (frontend) | ✅ Implemented | Login as demo User or Host without backend |
| Form validation | ✅ Working | Zod + React Hook Form throughout |
| Backend: auth | ✅ Working | Register, login, JWT |
| Backend: events | ✅ Working | Full CRUD + lifecycle transitions |
| Backend: places | ✅ Working | Full CRUD + host management |
| Backend: bookings | ✅ Working | Atomic + capacity-checked |
| Backend: availability (legacy) | ✅ Working | Date-slot CRUD |
| Backend: availability (unified) | ✅ Working | Profiles, slots, overrides |
| Backend: scheduling intelligence | ✅ Working | Suggest-time, snapshot |
| Backend: communities | ⚠️ Schema only | Routes not confirmed |
| Backend: messages | ❌ Missing | Schema designed, not built |
| Host Dashboard (real data) | ⚠️ Partial | May still be placeholder |
| Frontend ↔ Backend integration | ⚠️ Partial | Many pages use mock data |
| Contact form submission | ⚠️ Partial | Form exists, backend unclear |
| Event approval flow (frontend) | ⚠️ Unclear | UI for approve/publish buttons? |
| Image upload | ⚠️ Partial | Vercel Blob configured |
| Admin panel | ❌ Not built | No admin UI or host approval flow |

### 3.6 Demo Mode Behaviour

- Demo login available without backend running
- Two demo personas: **Demo User** (role: user), **Demo Host** (role: host)
- Tokens: `demo:user` / `demo:host` stored in localStorage
- Mock data (~108KB) provides full UI experience
- `AuthContext` handles demo token detection and mock profile injection

---

## PART 4: IDENTIFIED GAPS BETWEEN REQUIREMENTS AND CURRENT STATE

### GAP 1 — Frontend uses mock data, not live backend data (Critical)

**Requirement:** Users create/edit/delete real content; changes persist
**Current state:** Many pages display mock data and API write calls likely fail silently
**Impact:** Users cannot actually use the product; all "create" flows are broken in production
**Files involved:** Most `src/pages/*.jsx` and `src/api/*.js`

---

### GAP 2 — Host Dashboard (Critical)

**Requirement:** Hosts need an overview of their venues, events, and booking statistics
**Current state:** May still be a placeholder ("Coming soon") or only partially connected
**Impact:** Host workflow is not completable; hosts cannot manage their business
**Files involved:** `src/pages/HostDashboard.jsx`

---

### GAP 3 — Event Approval Flow (frontend) (Critical)

**Requirement:** Hosts see proposed events and can approve/reject; facilitators can publish approved events
**Current state:** Backend supports this fully (atomic, conflict-checked). Frontend UI for approve/publish buttons is unclear
**Impact:** Event lifecycle cannot progress; no events can be published; no bookings can be made
**Files involved:** `src/pages/ListingDetail.jsx`, `src/pages/MyEvents.jsx`, `src/pages/HostDashboard.jsx`

---

### GAP 4 — Messages / DM System (High)

**Requirement:** Members can message hosts and facilitators; essential for coordination
**Current state:** Frontend UI is built. Backend schema is designed but routes not confirmed as built
**Impact:** Coordination requires external tools; platform engagement suffers
**Files involved:** `src/pages/Messages.jsx`, `backend/routes/messages.js` (missing?)

---

### GAP 5 — Admin: Host Application Review (High)

**Requirement:** Users submit a "Become Host" form; admins review and approve/reject
**Current state:** BecomeHost form exists. No admin UI exists. No workflow to change user role
**Impact:** No new hosts can be onboarded; platform cannot grow its supply side
**Files involved:** `src/pages/BecomeHost.jsx`, no admin routes/pages exist

---

### GAP 6 — Communities Backend (Medium)

**Requirement:** Users create/join communities; communities are associated with events and spaces
**Current state:** Database schema and frontend pages exist. Backend routes for communities not confirmed
**Impact:** Community features are display-only; cannot create or join communities
**Files involved:** `src/pages/Communities.jsx`, `backend/routes/communities.js` (status unclear)

---

### GAP 7 — Availability Frontend Integration (Medium)

**Requirement:** Hosts set venue availability; facilitators set personal availability; system enforces scheduling
**Current state:** Complex availability components built (7 calendar/availability components). Backend fully built. Integration completeness unclear
**Impact:** Scheduling intelligence cannot function without accurate availability data
**Files involved:** `src/components/availability/`, `src/api/availability.js`, `src/api/availability-unified.js`

---

### GAP 8 — Profile Management (Medium)

**Requirement:** Users can update their name, bio, role-specific details
**Current state:** Profile form exists but save likely fails; some buttons are "Coming soon"
**Impact:** Users feel the app is unfinished; cannot personalise experience
**Files involved:** `src/pages/Profile.jsx`

---

### GAP 9 — Two Availability Engines (Architecture Risk)

**Requirement:** Single, consistent availability model
**Current state:** Two parallel availability systems exist:
  - Legacy: `place_availability`, `facilitator_availability`, `member_availability` (date+time slots)
  - Unified: `availability_profiles` + `availability_slots` + `availability_overrides` (recurring + overrides)
**Impact:** Data fragmentation, inconsistent UX, double maintenance burden
**Recommendation:** Decide which engine is canonical and migrate/remove the other

---

### GAP 10 — No Activity Categories in Search/Browse (UX)

**Requirement:** Five categories (CREATE, MOVE, CELEBRATE, LEARN, RELAX) should be a primary navigation/filtering mechanism
**Current state:** Categories mentioned in design docs but it's unclear if filtering by category is functional end-to-end
**Impact:** Discoverability of events by interest is broken; homepage category selector may not work
**Files involved:** `src/pages/Explore.jsx`, `src/pages/Home.jsx`

---

## PART 5: QUESTIONS FOR THE AI REVIEWER

Please assess and provide feedback on the following specific questions:

### Q1: Prioritisation
Given the gaps listed in Part 4, what is the recommended order of implementation to reach a production-ready MVP? Consider both user impact and technical dependency ordering.

### Q2: Architecture — Dual Availability Systems
Is it advisable to keep both the legacy and unified availability systems, or should the team consolidate? What is the lowest-risk migration path?

### Q3: Frontend-Backend Integration Strategy
What is the safest approach to replace mock data with live API calls without breaking the demo mode experience that currently exists?

### Q4: Database — SQLite for Production
SQLite is used currently. Is this appropriate for an MVP going to production? At what point and under what conditions should the team migrate to PostgreSQL or similar?

### Q5: Event Lifecycle UX
The event lifecycle (proposed → venue_approved → published → bookable) is technically sound but potentially confusing for first-time users. How should this be communicated in the UI to minimise friction?

### Q6: Host Onboarding
The "Become a Host" flow requires admin approval. This creates a bottleneck. Are there alternative patterns (e.g., self-serve with delayed verification) that might reduce friction while maintaining quality control?

### Q7: Missing Features vs Polishing Existing
The codebase has many features at 70-80% completion. Is it better to finish each to 100% before starting the next, or ship a narrower but more complete slice of the product?

### Q8: Testing Coverage
Unit tests exist for UI components and some API modules. Is there adequate coverage for the critical paths (booking creation, event approval, conflict detection)? What integration or E2E tests are most important to add?

---

## PART 6: SUMMARY METRICS

| Metric | Value |
|--------|-------|
| Total frontend pages | 36 |
| Total backend routes (approx) | 40+ |
| Database tables | 13 |
| Documentation files | 35+ |
| Test files | 20 |
| Lines of code (approx) | 15,000+ |
| MVP completion estimate | ~70–75% |
| Critical gaps remaining | 5 (Gaps 1–5 above) |
| Architecture risks | 1 (dual availability systems) |

---

## PART 7: APPENDIX — KEY FILE LOCATIONS

| Concern | File Path |
|---------|-----------|
| Auth context | `src/contexts/AuthContext.jsx` |
| Route definitions | `src/router/index.jsx` |
| API client (axios) | `src/api/client.js` |
| Mock data root | `src/mocks/` |
| UI component library | `src/components/ui/` |
| Availability components | `src/components/availability/` |
| Database schema | `backend/db.js` |
| Event service (business logic) | `backend/services/eventService.js` |
| Booking service | `backend/services/bookingService.js` |
| Conflict detection | `backend/utils/conflicts.js` |
| Unified availability routes | `backend/routes/availability-unified.js` |
| Seed script | `backend/scripts/seedMVP.js` |
| Style guide | `docs/style-guide.md` |
| UX improvement plan | `docs/UX_IMPROVEMENT_PLAN.md` |
| Phase 1 baseline analysis | `docs/PHASE1_BASELINE_ANALYSIS.md` |
| Task 3 completion (backend) | `docs/TASK3_COMPLETION_SUMMARY.md` |

---

*Document prepared March 2026. Reflects implementation state as of latest task completion.*
