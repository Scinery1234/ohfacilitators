# Availability Engine: Back-end Infrastructure Plan

Back-end plan (database and API) for the availability engine, aligned with [AVAILABILITY_UI_PLAN.md](./AVAILABILITY_UI_PLAN.md) and [AVAILABILITY_ENGINE_RESEARCH.md](./AVAILABILITY_ENGINE_RESEARCH.md).

---

## 1. Design principles

- **Single engine:** One data model and API for venue, host, and facilitator availability (USER and VENUE profiles).
- **Recurring + overrides:** Default availability comes from recurring slots (by day-of-week); date-specific overrides (BLOCKED, BOOKED) and one-off slots (open a date) modify the result.
- **Partial-day support:** Overrides can be full-day (00:00–23:59) or a specific time range on a date (e.g. 12:00–14:00).
- **Slot derivation:** Bookable time slots are computed from recurring slots minus blocked/overlap logic, not stored as rows.

---

## 2. Database schema

### 2.1 Tables

**availability_profiles**  
One row per “schedulable resource” (user or venue).

| Column       | Type         | Constraints / notes |
|-------------|--------------|----------------------|
| id          | UUID (PK)    | |
| owner_type  | VARCHAR(16)  | `'USER'` or `'VENUE'` |
| owner_id    | VARCHAR(64)  | User ID or venue/place ID |
| timezone    | VARCHAR(64)  | Optional, e.g. `'Australia/Sydney'` |
| created_at  | TIMESTAMPTZ  | |
| updated_at  | TIMESTAMPTZ  | |
| UNIQUE(owner_type, owner_id) | | One profile per user/venue |

**availability_slots**  
Recurring (day-of-week) or one-off (date) “available” windows. Used for working hours and “open this day.”

| Column       | Type         | Constraints / notes |
|-------------|--------------|----------------------|
| id          | UUID (PK)    | |
| profile_id  | UUID (FK)    | → availability_profiles.id, ON DELETE CASCADE |
| date        | DATE         | NULL = recurring; set = one-off slot for that date |
| day_of_week | SMALLINT     | 0–6 (Sun–Sat). NULL when date is set |
| period      | VARCHAR(32)  | Optional label, e.g. `'MORNING'`, `'CUSTOM'` |
| start_time  | TIME         | Start of available window (e.g. 09:00) |
| end_time    | TIME         | End of available window (e.g. 17:00) |
| status      | VARCHAR(16)  | Default `'AVAILABLE'` |
| created_at  | TIMESTAMPTZ  | |
| updated_at  | TIMESTAMPTZ  | |
| CHECK: (date IS NULL AND day_of_week IS NOT NULL) OR (date IS NOT NULL AND day_of_week IS NULL) | | Recurring vs one-off |

**availability_overrides**  
Date-specific blocks or booked times. Supports full-day and partial-day (start_time/end_time).

| Column       | Type         | Constraints / notes |
|-------------|--------------|----------------------|
| id          | UUID (PK)    | |
| profile_id  | UUID (FK)    | → availability_profiles.id, ON DELETE CASCADE |
| date        | DATE         | The override applies to this date |
| start_time  | TIME         | Start of override window (e.g. 00:00 for full-day block) |
| end_time    | TIME         | End of override window (e.g. 23:59 for full-day block) |
| status      | VARCHAR(16)  | `'BLOCKED'` or `'BOOKED'` |
| reference_id| VARCHAR(64)  | Optional, e.g. booking_id or event_id for BOOKED |
| notes       | TEXT         | Optional |
| created_at  | TIMESTAMPTZ  | |
| updated_at  | TIMESTAMPTZ  | |

### 2.2 Indexes

- **availability_profiles:** `UNIQUE(owner_type, owner_id)` (already); index on `owner_type, owner_id` for lookups.
- **availability_slots:** `(profile_id)`, `(profile_id, date)`, `(profile_id, day_of_week)` for “get slots for profile” and “slots for profile on date/day.”
- **availability_overrides:** `(profile_id)`, `(profile_id, date)` for “get overrides for profile” and “overrides for profile on date.”

### 2.3 Normalization notes

- Slots define “when the resource is available” (recurring or one-off).
- Overrides define “when the resource is explicitly unavailable or booked” on a date (full or partial day).
- Bookable slots are **computed**: take slots that apply to the date, subtract BLOCKED/BOOKED override ranges, then generate discrete start/end times (e.g. 30‑min increments). No separate “bookable_slots” table.

---

## 3. API endpoint architecture

Base path: `/api/availability` (or `/api/v1/availability`). All endpoints that mutate require authentication; reads may be public for public booking pages (venue/event slots) depending on product.

### 3.1 Profile

| Method | Path | Purpose | Request / response |
|--------|------|---------|--------------------|
| GET    | `/api/availability/profile` | Get (or create) profile for a resource | Query: `ownerType`, `ownerId`. Response: `{ profile, slots?, overrides? }` (slots/overrides optional for lightweight “get or create”). |
| POST   | `/api/availability/profile` | Create or update profile | Body: `{ ownerType, ownerId, timezone? }`. Response: `{ profile }`. |

Used by: Venue and user “working hours” UI (ensure profile exists); loading calendar data.

### 3.2 Slots (recurring and one-off)

| Method | Path | Purpose | Request / response |
|--------|------|---------|--------------------|
| POST   | `/api/availability/slot` | Create a slot | Body: `{ ownerType, ownerId, date?, dayOfWeek?, period?, startTime, endTime, status? }`. Response: `{ slot }`. |
| DELETE | `/api/availability/slot/:slotId` | Delete a slot | Response: 204. |

Used by: Working hours form (create recurring slots; replace = delete existing recurring for that profile then create new set); “Open this day” (create one-off slot with `date` set).  
Note: “Get slots” is done via “get availability” (profile + slots + overrides together).

### 3.3 Overrides (block / booked)

| Method | Path | Purpose | Request / response |
|--------|------|---------|--------------------|
| POST   | `/api/availability/override` | Create override (BLOCKED or BOOKED) | Body: `{ ownerType, ownerId, date, startTime, endTime, status, referenceId?, notes? }`. Response: `{ override }`. |
| DELETE | `/api/availability/override/:overrideId` | Delete override | Response: 204. |

Used by: Venue/user calendar “Block this day,” “Block time window on this day,” “Block date range”; event creation (create BOOKED overrides for venue, host, facilitator(s)).  
Partial-day: send `startTime`/`endTime` for that window (e.g. 12:00–14:00). Full-day: 00:00–23:59 (or 00:00:00–23:59:59).

### 3.4 Availability read (per resource)

| Method | Path | Purpose | Request / response |
|--------|------|---------|--------------------|
| GET    | `/api/availability/venues/:venueId/availability` | Get venue schedule + overrides | Query: `date?` (optional filter). Response: `{ profile, slots, overrides, conflicts? }`. |
| GET    | `/api/availability/users/:userId/availability` | Get user schedule + overrides | Query: `date?`. Response: `{ profile, slots, overrides, conflicts? }`. |

Used by: Venue availability calendar; user availability calendar; working hours form load.  
Back end: resolve profile by (VENUE, venueId) or (USER, userId); return slots and overrides (optionally filtered by `date`).

### 3.5 Check availability (single resource, exact window)

| Method | Path | Purpose | Request / response |
|--------|------|---------|--------------------|
| POST   | `/api/availability/venues/:venueId/check-availability` | Is venue free for a window? | Body: `{ date, startTime, endTime }`. Response: `{ available: boolean }`. |
| POST   | `/api/availability/users/:userId/check-availability` | Is user free for a window? | Body: `{ date, startTime, endTime }`. Response: `{ available: boolean }`. |

Used by: Event creation “confirm before submit”; “search by time-slot” (client can call per day).  
Back end: for given date, get applicable slots (recurring by day-of-week + one-off for date); get overrides for that date; compute whether [startTime, endTime] is fully inside an available segment and not overlapping any BLOCKED/BOOKED range; return boolean.

### 3.6 Slots for a single resource (bookable time slots on a day)

| Method | Path | Purpose | Request / response |
|--------|------|---------|--------------------|
| GET    | `/api/availability/venues/:venueId/slots` | Get bookable slots for venue on a date | Query: `date` (required), `durationMinutes?`, `incrementMinutes?`, `minNoticeMinutes?`. Response: `{ slots: [{ startTime, endTime }, ...] }`. |
| GET    | `/api/availability/users/:userId/slots` | Get bookable slots for user on a date | Same query/response. |

Used by: Venue “Preview: Available slots on [date]”; user slot preview; public booking page (venue); event creation if only one resource is selected.  
Back end: same as today’s slot derivation (recurring + one-off slots minus BLOCKED/BOOKED ranges, then generate discrete slots by duration/increment; apply min notice if needed).

### 3.7 Search by time window (which days is a window available)

| Method | Path | Purpose | Request / response |
|--------|------|---------|--------------------|
| GET    | `/api/availability/venues/:venueId/availability-by-window` | List dates in range when venue is free for a time window | Query: `dateFrom`, `dateTo`, `startTime`, `endTime`. Response: `{ dates: ['YYYY-MM-DD', ...] }`. |
| GET    | `/api/availability/users/:userId/availability-by-window` | Same for user | Same query/response. |

Used by: Venue (and user) “Filter by time window” / “Show days when [start]–[end] is available.”  
Back end: for each date in [dateFrom, dateTo], run same logic as check-availability for [startTime, endTime]; return list of dates where available === true.

### 3.8 Combined (event: venue + host + facilitators)

| Method | Path | Purpose | Request / response |
|--------|------|---------|--------------------|
| POST   | `/api/availability/check-event` | Are all given resources free for a window? | Body: `{ venueId?, hostId?, facilitatorIds?, date, startTime, endTime }`. Response: `{ venueAvailable?, hostAvailable?, facilitatorsAvailable?: { [id]: boolean }, available: boolean }`. All ids optional; available = true only when every provided resource is available. |
| GET    | `/api/availability/event-slots` | Bookable slots when all given resources are free | Query: `venueId?`, `hostId?`, `facilitatorIds?` (repeat or comma-separated), `date`, `durationMinutes?`, `incrementMinutes?`, `minFacilitators?` (e.g. 1 = at least one facilitator). Response: `{ slots: [{ startTime, endTime }, ...] }`. |

Used by: Event creation (HostEvent) slots-first flow: pick venue/community/facilitators → pick date → event-slots → pick slot → check-event before submit.  
Back end: get slots per resource (venue, host, each facilitator); intersect; optionally apply “at least one of facilitatorIds” (union facilitator slots then intersect with venue/host). Return merged time ranges as discrete slots.

### 3.9 Community heatmap (existing concept)

| Method | Path | Purpose | Request / response |
|--------|------|---------|--------------------|
| GET    | `/api/availability/communities/:communityId/availability-heatmap` | Aggregate member availability by day/period | Response: `{ heatmap, totalMembers, venues? }` (as today). |

Used by: Community detail page. Can stay on existing implementation (member availability is out of sync engine scope).

---

## 4. UI → endpoint mapping

| UI surface | Endpoints used |
|------------|----------------|
| **Venue: Working hours** | GET profile (or GET venue availability) to load; POST slot (batch replace recurring); DELETE slot. |
| **Venue: Date overrides** | GET venue availability (slots + overrides); POST override (block day, block time window, block range); DELETE override; POST slot for “Open this day.” |
| **Venue: Slot preview** | GET venues/:venueId/slots?date=… |
| **Venue: Search by time-slot** | GET venues/:venueId/availability-by-window?dateFrom&dateTo&startTime&endTime |
| **User: Working hours** | GET user availability; POST slot; DELETE slot. |
| **User: Date overrides** | GET user availability; POST override; DELETE override; POST slot for “Open this day.” |
| **User: Slot preview** | GET users/:userId/slots?date=… |
| **Event creation (slots-first)** | GET event-slots (venueId?, hostId?, facilitatorIds?, date); POST check-event before submit; on event create, POST override (BOOKED) for venue, host, facilitator(s). |
| **Public booking (future)** | GET venues/:venueId/slots?date=…; on book, POST override (BOOKED) for venue (and optionally user if 1:1). |

---

## 5. Event creation and “booked” state

When an event is created:

1. Backend (or front-end calling API) creates **BOOKED** overrides for the event’s date and time range for:
   - The **venue** (if any),
   - The **host** (event creator),
   - Each **assigned facilitator** (if any).
2. Optional: set `reference_id` to the event ID (or booking ID) for traceability.
3. Subsequent calls to `getVenueAvailability`, `getUserAvailability`, `getVenueAvailabilitySlots`, `getEventAvailabilitySlots`, and `checkEventAvailability` will treat those windows as unavailable.

No separate “bookings” table is required for availability logic; the engine only needs overrides with status BOOKED. The events (or bookings) table remains the source of truth for “what event”; availability_overrides is the source of truth for “when a resource is busy.”

---

## 6. Implementation order (back-end)

1. **Schema:** Create `availability_profiles`, `availability_slots`, `availability_overrides`; indexes and FKs; migrations.
2. **Profile + slots + overrides CRUD:** Implement GET/POST profile, POST/DELETE slot, POST/DELETE override; resolve owner_type/owner_id to profile_id.
3. **Venue availability:** GET venue availability; POST venue check-availability; GET venue slots (with slot derivation logic).
4. **User availability:** GET user availability; POST user check-availability; GET user slots.
5. **Availability by window:** GET venue and user availability-by-window (list of dates where a time window is free).
6. **Event combined:** POST check-event; GET event-slots (intersect venue + host + facilitator).
7. **Event creation hook:** When event is created, create BOOKED overrides for venue, host, facilitator(s).

This order supports the UI plan: venue first (working hours + overrides + slot preview + search by window), then user (same), then event creation (combined APIs + booked state).
