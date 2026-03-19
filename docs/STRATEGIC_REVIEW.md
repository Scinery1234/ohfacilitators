# Strategic Codebase Review — OhPlaces / Purposefields Ecosystem
**Reviewer:** Claude (automated)
**Review Date:** March 2026
**Against:** Ecosystem Architecture Document v1.0, March 2026
**Branch:** claude/codebase-strategic-review-k3kLQ

---

## Executive Summary

The codebase is currently a **community/facilitator platform** (OhFacilitators) that is significantly short of the OhPlaces/Purposefields architecture described in the spec. The core gaps are:

- No multi-tenancy (no `tenant_id`, no `tenants` table)
- No payment processing (no Stripe)
- No calendar integration (no Cal.com)
- No SMS (no Twilio)
- No Stripe webhook / Cal webhook / cron jobs
- Database uses Neon PostgreSQL + raw SQL (not Supabase with RLS)
- Frontend uses Vite + React (not Next.js)
- No branding/white-label system

The existing community, messaging, and host-application features are well-built and provide a solid foundation, but the **entire booking/payment/SMS critical path is missing**.

---

## Review Findings by Area

---

### 1. BRANDING BOUNDARY

**Status:** ❌ Missing or broken
**Risk Level:** Critical

**Findings:**
- No concept of OhPlaces vs Purposefields as separate interfaces exists in the codebase
- No tenant branding system (logo, primary colour, name per tenant)
- No white-label domain routing
- Single shared UI with no interface boundary
- `server-lib/db.ts`: No `tenants` table, no `logo_url`, `primary_color`, or `slug` per tenant

**Recommendation:**
1. Create a `tenants` table with `slug`, `name`, `logo_url`, `primary_color`, `domain`
2. Add `tenant_id` to all user-facing data tables
3. Create a tenant-resolution middleware (slug → subdomain → custom domain)
4. Build a `TenantBrandingContext` in the frontend that injects logo/colour from the API

---

### 2. MULTI-TENANCY & DATA ISOLATION

**Status:** ❌ Missing or broken
**Risk Level:** Critical

**Findings:**
- No `tenant_id` column on `users`, `events`, `bookings`, `places` tables (`server-lib/db.ts`)
- Database is Neon PostgreSQL — no Supabase RLS in place
- All queries in `api/events/index.ts`, `api/bookings/index.ts` etc. are global (no tenant scoping)
- No middleware for tenant resolution from slug/subdomain/custom domain
- Any authenticated user can read any public event across all tenants (no isolation)

**Recommendation:**
1. Add `tenant_id TEXT NOT NULL REFERENCES tenants(id)` to `users`, `events`, `bookings`, `venues`
2. Scope all queries with `AND tenant_id = $tenantId`
3. Create `server-lib/resolveTenant.ts` that extracts tenant from:
   - Path prefix: `/api/hosts/:slug`
   - Host header: subdomain or custom domain
4. Since Supabase RLS is not available, enforce tenant isolation at the application layer — every SQL query touching sensitive tables must include a `tenant_id` filter

---

### 3. CORE DATA MODEL INTEGRITY

**Status:** ❌ Missing or broken
**Risk Level:** Critical

**Findings:**

**`tenants` table:** Does not exist.
- Missing: `id`, `slug`, `name`, `domain`, `logo_url`, `primary_color`, `stripe_account_id`, `cal_api_key`, `twilio_number`, `purposefields_opt_in`, `plan`

**`users` table** (`server-lib/db.ts:9-18`):
- Missing: `phone`, `tenant_id`, `booking_history`
- `role` has wrong values — currently `'user'` default, spec requires `'participant' | 'host' | 'admin'`

**`events` table** (`server-lib/db.ts:148-168`):
- Missing: `tenant_id`, `host_id`, `venue_id`, `cal_event_type_id`, `modality`, `price`, `pricing_type`, `discoverable`, `status`, `recurrence_rule`
- Has `visibility` (draft/unlisted/public) — overlaps with `status` in spec but is not the same concept

**`bookings` table** (`server-lib/db.ts:35-56`):
- Missing: `tenant_id`, `payment_status`, `stripe_payment_intent_id`, `amount_paid`, `platform_fee`, `sms_confirmation_sent`, `sms_reminder_24h_sent`, `sms_reminder_1h_sent`, `attended`, `cal_booking_uid`
- Has `listingType`/`listingId` polymorphic approach — spec uses direct `event_id` FK

**`venues` table:** Does not exist — only `places` table exists, which is community-scoped, not tenant-scoped, and lacks `suburb`, `city`, `purposefields_visible`

**Missing indexes** for high-frequency queries:
- `events(tenant_id)` — missing
- `bookings(tenant_id)` — missing
- `events(discoverable, tenant_id)` — missing

**Recommendation:**
- Add all missing tables and columns via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `initDb()` (backward-safe)
- Create `venues` table separately from `places`
- Add indexes on `tenant_id` for every table that has it

---

### 4. BOOKING FLOW

**Status:** ❌ Missing or broken
**Risk Level:** Critical (P0 blocker)

**Findings:**

The entire payment-integrated booking flow is absent:

- `api/bookings/index.ts`: Creates bookings with no Stripe integration. No `stripe_payment_intent_id`, no checkout session, no server-side price calculation
- No `GET /api/events/:id/slots` endpoint (Cal.com slots) — missing entirely
- No `POST /api/bookings` that creates a Stripe checkout session
- No validation that payment happens before Cal.com slot reservation
- Capacity check (`api/bookings/index.ts:176-185`) uses a non-atomic read-then-write — **race condition exists**: two concurrent requests can both read `count < capacity` and both proceed to insert
- No server-side price calculation — price must never come from client

**Specific race condition location:** `api/bookings/index.ts:179-184` — the SELECT COUNT then INSERT pattern is not protected by a transaction or advisory lock.

**Recommendation:**
1. Create `api/events/[id]/slots.ts` — proxy to Cal.com `/slots` endpoint
2. Rewrite `POST /api/bookings` to:
   a. Calculate price server-side from `events.price` (never from request body)
   b. Create a Stripe Checkout Session with `payment_intent_data.application_fee_amount`
   c. Insert booking with `status='pending'` and `payment_status='awaiting_payment'`
   d. Return the Stripe checkout URL
3. Fix capacity race: use `INSERT INTO bookings ... WHERE (SELECT COUNT(*) ...) < capacity` in a single atomic query, or use `SELECT ... FOR UPDATE` inside a transaction

---

### 5. SMS REMINDERS

**Status:** ❌ Missing or broken
**Risk Level:** Critical (P0/P1)

**Findings:**
- No Twilio integration anywhere in the codebase
- No `/api/cron/reminders` endpoint
- Booking schema lacks `sms_confirmation_sent`, `sms_reminder_24h_sent`, `sms_reminder_1h_sent` flags
- No Vercel Cron configuration in `vercel.json` (currently just `{"framework": "vite"}`)

**Recommendation:**
1. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` to env
2. Create `server-lib/sms.ts` — thin wrapper around Twilio REST API
3. Create `api/cron/reminders.ts`:
   - Auth: check `Authorization: Bearer $CRON_SECRET` header
   - Query: `SELECT * FROM bookings WHERE sms_reminder_24h_sent = false AND start_time BETWEEN NOW() + 23h AND NOW() + 25h`
   - Send SMS, then `UPDATE bookings SET sms_reminder_24h_sent = true WHERE id = $id`
   - Same for 1h reminders
   - Use atomic update-with-condition to prevent duplicate sends
4. Add cron schedule to `vercel.json`:
   ```json
   {"crons": [{"path": "/api/cron/reminders", "schedule": "*/30 * * * *"}]}
   ```

---

### 6. SECURITY

**Status:** ⚠️ Partially implemented / concerns
**Risk Level:** Critical

**Findings:**

**Critical:**
- `server-lib/auth.ts:4` — `JWT_SECRET` falls back to a hardcoded dev string `'ohfacilitators-dev-secret-change-in-production'`. In production without `JWT_SECRET` set, all JWTs would be signed with this public value — **any attacker can forge tokens**
- No Stripe webhook signature verification (no webhook handler exists yet)
- No server-side price calculation — price currently not relevant (no payments) but MUST be enforced when Stripe is added

**Medium:**
- `api/bookings/index.ts:38` — `SELECT * FROM bookings WHERE id = $id` fetches the full row before checking ownership. Acceptable but exposes data to timing analysis
- `api/admin/set-admin.ts` — Only requires `ADMIN_SECRET` match, no rate limiting. Brute-forceable if secret is weak
- Rate limiting in `api/messages/index.ts` uses in-memory state — resets on Vercel cold starts, providing no real protection

**Recommendation:**
1. `server-lib/auth.ts`: throw an error if `JWT_SECRET` is not set and `NODE_ENV === 'production'`
2. When Stripe webhook is added: always use `stripe.webhooks.constructEvent(rawBody, signature, secret)` — never parse the body manually
3. Add `STRIPE_WEBHOOK_SECRET` to env vars
4. Consider Redis-backed rate limiting for production (e.g., Upstash)

---

### 7. API COMPLETENESS

**Status:** ❌ Missing or broken
**Risk Level:** Critical

**Findings — Participant-Facing (no auth):**

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/hosts/:slug` | ❌ Missing | No `api/hosts/` directory |
| `GET /api/events?tenant=:slug` | ⚠️ Partial | Exists but not tenant-scoped |
| `GET /api/events/:id/slots` | ❌ Missing | No Cal.com integration |
| `POST /api/bookings` | ⚠️ Partial | Exists but no Stripe, no price calc |
| `POST /api/bookings/:id/cancel` | ❌ Missing | DELETE exists but no email-token auth |

**Findings — Host-Facing (JWT required):**

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/dashboard/sessions` | ❌ Missing | No `/api/dashboard/` directory |
| `GET /api/dashboard/sessions/:id/participants` | ❌ Missing | |
| `PATCH /api/dashboard/bookings/:id/attended` | ❌ Missing | `attended` field missing from schema |
| `POST /api/dashboard/events` | ❌ Missing | Generic event creation exists but not tenant-scoped |
| `DELETE /api/dashboard/events/:id` | ⚠️ Partial | Exists but no participant notification |

**Findings — Webhooks & Cron:**

| Endpoint | Status | Notes |
|---|---|---|
| `POST /api/webhooks/stripe` | ❌ Missing | |
| `POST /api/webhooks/cal` | ❌ Missing | |
| `POST /api/cron/reminders` | ❌ Missing | |

**Recommendation:** Implement all missing endpoints in priority order (payment flow first, then dashboard, then webhooks, then cron).

---

### 8. PURPOSEFIELDS DISCOVERY INTEGRATION

**Status:** ❌ Missing (correctly deferred per MVP scope)
**Risk Level:** Low (per spec, this is v2)

**Findings:**
- `events` table has no `discoverable` field
- `places` table has no `purposefields_visible` field
- No Purposefields-specific API routes

**Recommendation:**
- Add `discoverable BOOLEAN DEFAULT false` to `events` table now (schema prep is zero cost)
- Add `purposefields_visible BOOLEAN DEFAULT false` to `venues` table
- Ensure ALL queries to public event lists filter `discoverable = true` when implementing Purposefields layer — do NOT expose by default
- Do not build discovery UI — correctly deferred to v2

---

### 9. MVP SCOPE COMPLIANCE

**Status:** ⚠️ Partially implemented / concerns
**Risk Level:** Medium

**Findings:**

**In scope but missing:** The payment/SMS/calendar critical path is P0 and entirely absent.

**Potentially premature (out of spec scope):**
- **Community management** (`api/communities/`, `api/community-admin/`, `api/community-join/`, `api/community-link-requests/`) — rich feature set not mentioned in architecture spec. May be correct for the facilitator community layer, but consumes significant build capacity
- **Messaging** (`api/messages/`) — not in MVP spec. Rate-limiting is in-memory only
- **Host applications** (`api/host-applications/`) — manual approval flow; spec doesn't mention this
- **Availability engine** (`/backend/routes/availability-unified.js`) — complex scheduling logic that may overlap with Cal.com's responsibility

**Recommendation:**
- Freeze new feature development on communities/messaging until core booking flow (Stripe + Cal.com + SMS) is complete
- The availability engine should be replaced by Cal.com API calls for slot fetching — avoid building parallel scheduling logic

---

### 10. USER EXPERIENCE REQUIREMENTS

**Status:** ❌ Missing or broken
**Risk Level:** High

**Findings:**
- No 3-step booking flow (details → payment → confirmation) in the frontend
- No host branding display (logo, name, colours from tenant config)
- No mobile-specific optimisation for booking pages
- No error state handling for failed payments, slot taken, or SMS failures
- No cancellation flow with email token auth

**Recommendation:**
1. Build booking flow as a self-contained React wizard component
2. Fetch tenant branding from `GET /api/hosts/:slug` on page load and inject via context
3. Handle Stripe redirect back with `?payment_intent_client_secret=...` for confirmation page
4. Add error boundaries around each booking step

---

## Phased Implementation Plan

### Phase 1 — Foundation (Week 1, Days 1-2) ✅ COMMENCED
**Goal:** Get the data model right. Everything else builds on this.

1. Extend `server-lib/db.ts`:
   - Add `tenants` table
   - Add `venues` table
   - Add missing columns to `users`, `events`, `bookings`
   - Add missing indexes

2. Fix `server-lib/auth.ts`: throw if `JWT_SECRET` not set in production

3. Expand `.env.example` with all required integrations

4. Create `api/hosts/[slug].ts` — `GET /api/hosts/:slug` public host profile

5. Create `api/webhooks/stripe.ts` — Stripe webhook skeleton with signature verification

6. Create `api/webhooks/cal.ts` — Cal.com webhook skeleton

7. Create `api/cron/reminders.ts` — SMS cron job with atomic flag updates

8. Update `vercel.json` with cron schedule and API rewrites

---

### Phase 2 — Stripe + Cal.com Integration (Week 1-2, Days 3-5)
**Goal:** Complete the critical-path booking flow.

1. Add Stripe npm package and create `server-lib/stripe.ts`
2. Create `api/events/[id]/slots.ts` — proxy Cal.com `/slots` endpoint
3. Rewrite `POST /api/bookings` — server-side price, Stripe checkout session
4. Implement `POST /api/webhooks/stripe`:
   - `payment_intent.succeeded` → mark booking confirmed → reserve Cal.com slot → send Twilio SMS
   - `charge.refunded` → mark booking refunded
5. Fix capacity race condition with atomic SQL
6. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CAL_API_KEY` to env handling

---

### Phase 3 — Twilio SMS (Week 2, Days 1-2)
**Goal:** SMS confirmation and reminders working end-to-end.

1. Create `server-lib/sms.ts` — Twilio wrapper
2. Wire SMS send into Stripe webhook handler on booking confirmation
3. Implement `api/cron/reminders.ts` — query and send 24h + 1h reminders
4. Test atomic flag updates to prevent duplicate sends

---

### Phase 4 — Host Dashboard APIs (Week 2-3)
**Goal:** Hosts can manage sessions and participants.

1. Create `api/dashboard/sessions.ts` — tenant-scoped upcoming sessions
2. Create `api/dashboard/sessions/[id]/participants.ts`
3. Create `api/dashboard/bookings/[id]/attended.ts` — PATCH mark attendance
4. Create `api/dashboard/events/index.ts` — POST create, DELETE cancel + notify
5. Ensure all dashboard routes require JWT + validate tenant ownership

---

### Phase 5 — Frontend Booking Flow (Week 3)
**Goal:** Participant-facing 3-step booking experience.

1. Build `BookingWizard` component (details → payment → confirmation)
2. Inject tenant branding from `GET /api/hosts/:slug`
3. Integrate Stripe.js for checkout redirect
4. Handle payment confirmation page
5. Mobile optimisation pass

---

## Critical Blockers for MVP Launch

The following must be resolved before any participant can complete a booking:

| Blocker | Location | Severity |
|---|---|---|
| No Stripe integration | Entire codebase | 🔴 P0 |
| No Cal.com slot fetching | No endpoint exists | 🔴 P0 |
| No SMS on booking confirmation | No Twilio | 🔴 P0 |
| Hardcoded JWT_SECRET fallback | `server-lib/auth.ts:4` | 🔴 Security Critical |
| No tenant isolation | All API routes | 🔴 P0 |
| Capacity race condition | `api/bookings/index.ts:179-184` | 🔴 P0 |
| No Stripe webhook | Missing entirely | 🔴 P0 |
| No cron job for reminders | Missing entirely | 🔴 P0 |
