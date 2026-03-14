# Availability Engine Research: Calendly, Acuity, Doodle, Partiful

Research and best practices applied to this platform’s venue/event availability (community hosts, venues, events).

---

## 1. Calendly

### How it works

- **Schedule first**: You set a **recurring availability schedule** (e.g. Mon–Fri 9–5). This is the default “when I’m available.”
- **Calendar sync**: Connected calendars (Google, Outlook) mark times as busy; those times are excluded from bookable slots.
- **Date overrides**: You can add **date-specific hours** (overrides) for a single date or range—either open extra time (e.g. “also 6–7pm on this Thursday”) or effectively block by not offering time.
- **Event types**: Each event type can have its own duration, buffers (before/after), and can use different schedules. Invitees see only **available time slots** (e.g. 15 or 30 min apart), not raw “available yes/no.”
- **Fine-tuning**: Minimum scheduling notice (e.g. 4 hours), maximum days in advance, start-time increments.

### Best parts to mimic

| Feature | Application for our platform |
|--------|-------------------------------|
| **One “schedule” + overrides** | One place: “Availability schedule” = default weekly hours; “Date overrides” = block or open specific dates. We already have this model; we align **copy and structure** to match. |
| **Guest sees slots, not just yes/no** | When we show availability (e.g. event creation or future booking), show **time slots** (e.g. 9:00, 9:30, 10:00) derived from venue availability, not only a boolean. |
| **Clear wording** | Use “Availability schedule,” “Working hours,” “Date override” (block / open specific date). Avoid “add different hours” on the calendar. |
| **Overrides are explicit** | Block = “unavailable”; open = “available this date (with times).” Same as our block/open. |

---

## 2. Acuity Scheduling

### How it works

- **Multiple calendars**: Each “calendar” has its own availability. Good for multiple staff or services.
- **Pooled availability**: Same service can be offered across calendars; clients see all available times without picking a calendar first. Assignment can be round-robin or priority.
- **Scheduling limits**: Global and per-calendar (e.g. how far ahead, how often).
- **Templates**: Monthly (advance), Daily (quick), Classes (recurring).

### Best parts to mimic

| Feature | Application for our platform |
|--------|-------------------------------|
| **One availability “surface” per resource** | One venue = one availability schedule. We don’t need multiple calendars per venue; we do keep “one schedule + overrides” per venue. |
| **Pooling / round robin** | For communities with multiple venues/hosts we could later pool “any available venue” or rotate; out of scope for current availability engine. |
| **Clear limits** | Optional: “Bookable up to X days ahead,” “Minimum X hours notice.” Can be added as venue or global settings later. |

---

## 3. Doodle

### How it works

Doodle offers two main modes:

**1. Group polls (classic Doodle)**  
- Organizer creates a poll: adds **meeting options** (dates and times).  
- **Week view**: Choose duration (e.g. 60, 90, 120 min or custom 5 min–12 hr), then click on the calendar grid to add time slots; “All-day” for 24-hour options.  
- **Month view**: Click dates to add slots, set start time and duration per date; “Add times” adds multiple slots on the same day.  
- Participants get a link and vote **Yes / No / If-need-be** (no account required).  
- Creator sees who responded and which options have consensus.  
- Time zones: poll uses organizer’s default; participants see times in their own zone.  
- No direct “book this slot”—the group chooses a time, then the organizer typically books it elsewhere or uses a separate booking flow.

**2. Booking page (1:1 scheduling)**  
- You create a **Booking Page** with a unique link.  
- **Availability**: Default is Mon–Fri 9am–5pm; you customize hours per page.  
- **Calendar sync**: Connect Google, Outlook, or Apple; Doodle reads “busy” and only shows **free** slots. Slots update in real time as things get booked.  
- **Power settings**: Meeting duration (from 5 min), max meetings per day, **buffer time** between meetings.  
- **What the guest sees**: A page that shows only **available time slots** (no yes/no voting)—pick a slot, add details, confirm; the meeting is created and both calendars are updated.  
- Optional: pre-meeting questions, video link (Meet, Zoom, Teams, Webex), location, payments (Stripe), Zapier.

**Availability management (how it looks)**  
- **Availability calendar / time**: You manage when you’re available via the Booking Page setup: set working hours (e.g. Mon–Fri 9–5), and optionally use **time blocking** to split the day into focus blocks.  
- Multiple Booking Pages can have **different hours** (e.g. one for clients, one for internal).  
- No separate “date overrides” UI like Calendly—availability is mainly “recurring hours” plus **calendar sync** (busy = blocked). Blocking is done by putting events on your calendar.

### How it looks (UI)

- **Poll creation**: Calendar grid (week or month); click to add slots; clear duration and “Add times” controls.  
- **Poll voting**: List or grid of options with Yes / No / If-need-be; participant name and response; summary of “best” options.  
- **Booking page (guest)**: Date picker or list of dates, then a list of **time slots** for the chosen day (e.g. 9:00, 9:30, 10:00); select one, fill form, confirm.  
- **Host side**: “Availability” is configured in the Booking Page settings (hours, buffers, limits); connected calendar is the source of truth for “busy.”

### Best parts to mimic

| Feature | Application for our platform |
|--------|-------------------------------|
| **Guest sees only available slots** | Same as Calendly: derive discrete slots (e.g. from venue + host/facilitator availability) and show a “pick a time” list. |
| **One place to set availability** | Working hours per “page” or resource; we use one schedule + date overrides per venue/person. |
| **Calendar = busy blocks** | Doodle uses connected calendar to block slots; we use explicit “block” overrides and can later add calendar sync. |
| **Buffers and limits** | Meeting duration, max per day, buffer between—optional for our engine (event duration, buffer between events). |
| **Time zones** | Doodle shows times in participant’s zone; we should support timezone for events and availability. |

---

## 4. Partiful

### How it works

- **Event-centric**: Focus on creating an event (date, time, place), then RSVPs, +1s, waitlist, etc. Less of a “availability engine” and more “event settings.”
- **No separate “availability schedule”**: Host picks date/time for the event; no recurring schedule or slot grid like Calendly.

### Best parts to mimic

| Feature | Application for our platform |
|--------|-------------------------------|
| **Event-first when appropriate** | For one-off parties/events, “pick a date and time” is enough. For **venues** that host recurring or bookable slots, we keep **schedule + overrides** (Calendly-style). Our venue availability is for “when can this space be used,” which fits Calendly/Acuity more than Partiful. |

---

## 5. Synthesis for this platform

### User types

- **Venue/host**: Sets when the venue is available; blocks dates; creates events at that venue.
- **Community**: May have multiple venues and facilitators; availability can drive “where/when can we run an event.”
- **Guest / booker**: (Current or future) Chooses an event or a venue and picks a time—should see **available slots** when we support booking.

### What we implement (aligned with Calendly + Acuity)

1. **Terminology and structure**
   - **Availability schedule**: The recurring “default weekly hours” (one time range per day set, same idea as “working hours”).
   - **Date overrides**: Block a date (or range) or open a specific date with a time range. No “add different hours” on an already-open day; to change recurring hours, edit the schedule.
   - Copy in the app: “Availability schedule,” “Default weekly hours,” “Date overrides” (block / open specific dates).

2. **Single source of truth**
   - One section: “Availability.” One engine: recurring slots + overrides. Calendar view is for **overrides** (block / open), not for editing the weekly schedule (that’s the form above).

3. **Time slots for guests / event creation**
   - **Implemented:** **getVenueAvailabilitySlots(venueId, date, options)** in `api/availability-unified.js` (and mock in `mocks/availability-unified.js`). Returns `{ slots: [{ startTime, endTime }, ...] }` for a given date. Options: `durationMinutes` (default 60), `incrementMinutes` (default 30), `minNoticeMinutes` (optional). Use in booking or event-creation UIs to show Calendly-style “pick a time” slots.

4. **Optional later**
   - Minimum scheduling notice (e.g. 2 hours).
   - Buffer between bookings (e.g. 15 min).
   - Multiple “schedules” per venue (e.g. summer vs winter); for now one schedule + overrides is enough.

---

## 6. Plan: Availability engine syncing host, facilitators, and venues

Based on the research above (Calendly-style schedule + overrides, Doodle/Calendly slot-based display, Acuity-style one surface per resource), this section plans a **single availability engine** that keeps host, facilitator, and venue availability in sync and answers “when can we run this event?” in one place.

### 6.1 Current state

| Resource        | API / model today | Used in |
|----------------|--------------------|--------|
| **Venue**      | Unified: `getVenueAvailability`, `checkVenueAvailability`, `getVenueAvailabilitySlots`. Profile + recurring slots + overrides (block/open). | PlaceDetail (manage), HostEvent (filter places) |
| **Facilitator**| Legacy: `getFacilitatorAvailability(userId, date)` returns availability entries. Different data shape than unified. | HostEvent (filter facilitators), FacilitatorAvailabilityManager |
| **Host**       | Implicit: often same as “venue owner” or logged-in user; no separate host availability API. | — |
| **Members**    | Legacy: `getMemberAvailability`, `getMemberAvailabilityCount(communityId, date)` for heatmap. | Community heatmap, HostEvent (member count) |

**Gap:** Venues use the unified engine (recurring + overrides); people (facilitators, host) use a different legacy model. There is no single “combined” check such as “slots when this venue and this facilitator are both free.”

### 6.2 Goal: one model, synced across host, facilitators, and venues

- **One availability model for every resource**  
  Each of these is a “schedulable resource” with the same structure:
  - **Host** (the user who owns the event / venue)
  - **Facilitator** (users who can lead or support the event)
  - **Venue** (place where the event happens)

- **Same data shape for all**  
  For each resource we store:
  - **Recurring schedule** (e.g. “Mon–Fri 9–5” or “Tue/Thu 10–12”)
  - **Date overrides**: block (unavailable) or open (available this date with given times)

  So host, facilitator, and venue each have “availability schedule + date overrides,” aligned with Calendly/Doodle.

- **Sync semantics**  
  “Availability is synced” means:
  1. **Single source of truth**  
     One engine (and one API layer) owns all availability for host, facilitators, and venues. No separate legacy “place availability” vs “facilitator availability” with different rules.
  2. **Same rules everywhere**  
     Recurring hours and date overrides apply the same way for people and venues (block = busy, open = available for that date/time).
  3. **Combined answers**  
     The engine can answer:
     - “Is venue V free at (date, start, end)?”
     - “Is facilitator F free at (date, start, end)?”
     - “Is host H free at (date, start, end)?”
     - “When are venue V and facilitator F both free on date D?” (slots)
     - “When are venue V, host H, and at least one of facilitators [F1, F2] free?” (for event creation)

### 6.3 Data model (unified)

- **Profile per resource**  
  - `ownerType`: `'USER'` (host or facilitator) or `'VENUE'`  
  - `ownerId`: user id or venue id  

  So: one profile per host, per facilitator, per venue (already so for venues in unified; extend to users).

- **Slots (recurring or one-off)**  
  - Recurring: `dayOfWeek` set, `date` null → “every Monday 9–5.”  
  - One-off: `date` set → “only on 2025-03-15 9–5.”  

  Same as today’s unified venue slots; use the same structure for USER profiles.

- **Overrides**  
  - `status: 'BLOCKED'` → unavailable for that date (and optional time range).  
  - `status: 'BOOKED'` → marked as booked (e.g. after an event is created).  

  Again, same as today; apply to both USER and VENUE.

- **No “second” availability system**  
  Retire or bridge legacy place/facilitator/member availability so that the only source of “when is X available?” is this unified engine.

### 6.4 API design (synced engine)

- **Per-resource (already in place for venues)**  
  - `getAvailabilityProfile(ownerType, ownerId)`  
  - `getVenueAvailability(venueId)` → for venues; equivalent for users: `getUserAvailability(userId)` returning same shape (profile + slots + overrides).  
  - `checkVenueAvailability(venueId, { date, startTime, endTime })`  
  - Add: `checkUserAvailability(userId, { date, startTime, endTime })` (same signature, for host or facilitator).  
  - `getVenueAvailabilitySlots(venueId, date, options)`  
  - Add: `getUserAvailabilitySlots(userId, date, options)` for “pick a time” for a person.

- **Combined (sync in one call)**  
  - **Event-centric check**  
    `checkEventAvailability({ venueId?, hostId?, facilitatorIds?, date, startTime, endTime })`  
    All of `venueId`, `hostId`, `facilitatorIds` are **optional**; only the resources provided are checked. Returns e.g. `venueAvailable`, `hostAvailable`, `facilitatorsAvailable: { [id]: boolean }`, and `available: true` only when every provided resource is available.  

  - **Event-centric slots**  
    `getEventAvailabilitySlots({ venueId?, hostId?, facilitatorIds?, date, options })`  
    Same: only intersect availability for resources that are provided. Returns `slots: [{ startTime, endTime }, ...]` where all requested resources are free. Optional: `minFacilitators: 1` so “at least one of these facilitators” is enough when multiple facilitator IDs are passed.

  These two endpoints are where “sync” is visible: one place that combines host, facilitators, and venue using the same underlying model.

### 6.5 Data flow and UI

- **Host / facilitator availability**  
  - Host and facilitators each get a **schedule + overrides** UI (same as venue: “Working hours (recurring)” + “Date overrides” calendar).  
  - Stored under `ownerType: 'USER'`, `ownerId: userId`.  
  - HostEvent (and any future “create event” flow) calls `checkEventAvailability` or `getEventAvailabilitySlots` instead of calling venue and facilitator APIs separately and merging in the client.

- **Venue availability**  
  - Unchanged: venue still has “Availability schedule” (working hours + date overrides) on PlaceDetail.  
  - Venue continues to use the same unified profile/slots/overrides.

- **Event creation flow**  
  1. User picks **venue** (or “no venue”) and optionally **facilitator(s)**.  
  2. For a chosen **date**, call `getEventAvailabilitySlots({ venueId, hostId, facilitatorIds, date, options })`.  
  3. Show a **Doodle/Calendly-style** list of time slots (e.g. 9:00, 9:30, 10:00).  
  4. On slot select, call `checkEventAvailability` with the exact (date, startTime, endTime) to confirm before creating the event.  
  5. On event create, create **overrides** (or “booked” blocks) for that date/time for venue, host, and assigned facilitator(s) so they appear busy going forward.

- **Sync in practice**  
  - **Write**: Creating/updating/deleting availability (recurring or override) always goes through the unified engine (one API).  
  - **Read**: Any “is X available?” or “when is X available?” uses the same engine (and for events, the combined endpoints).  
  - **Display**: Host and facilitator get the same “Availability schedule” + “Date overrides” UX as venues, so the **look and behavior** are synced too.

### 6.6 Implementation phases

| Phase | What |
|-------|------|
| **1. Extend unified engine to users** | Add USER profiles to unified engine (reuse existing slot/override model). Implement `getUserAvailability(userId)`, `checkUserAvailability(userId, { date, startTime, endTime })`, `getUserAvailabilitySlots(userId, date, options)`. Migrate facilitator (and host) availability reads from legacy API to these. |
| **2. Combined event APIs** | Implement `checkEventAvailability` and `getEventAvailabilitySlots` that intersect venue + host + facilitator availability. Use them in HostEvent (or new event-creation flow) so one call returns “can we do this time?” and “which times work?”. |
| **3. Host/facilitator schedule UI** | Add “Availability schedule” (working hours + date overrides) for the current user (host) and for facilitators (e.g. on profile or community management). Reuse same components as venue (e.g. WeeklyHoursForm + calendar), with `ownerType: 'USER'`, `ownerId`. |
| **4. Booked state and overrides** | When an event is created, create overrides (or booked slots) for that date/time for the venue, host, and facilitator(s) so future availability checks and slot lists reflect the booking. |
| **5. Deprecate legacy** | Once all reads/writes go through the unified engine, deprecate legacy `getPlaceAvailability`, `getFacilitatorAvailability`, `getMemberAvailability` (or make them thin wrappers that call the unified API). |

This plan keeps host, facilitators, and venues on the same availability model and syncs them through a single engine and a small set of combined APIs, while matching the research (Calendly schedule + overrides, Doodle/Calendly-style slots).

---

## 6.7 Re-assessment: suitability and usability by user type

A pass over the plan for **suitability** (does it fit each user’s needs?) and **usability** (can they use it without confusion or overload?) for the different kinds of users on the platform.

### User types (as used in the product)

| User type | Who they are | How they use availability today |
|-----------|----------------|-----------------------------------|
| **Venue owner** | User who listed a place | Sets venue availability on PlaceDetail (unified: working hours + date overrides). Creates events at their place. |
| **Event creator / host** | Logged-in user creating an event | Picks date/time, place, community. Sees which places and how many facilitators are “available” for that time. Not explicitly asked “are you free?” — only venue + facilitator availability are checked. |
| **Facilitator** | User who can lead/support events | Sets “when I can facilitate” in Profile via FacilitatorAvailabilityManager (legacy: date + time slots, no recurring). Shown in HostEvent as “available facilitators” count for the selected date. |
| **Community member** | Member of a community, not necessarily facilitator | Marks “when I’m available” in CommunityDetail (MemberAvailabilityMarker) for the community heatmap. Used for “how many members free on this date?” — informational, not for blocking or booking. |
| **Guest / booker** | (Future) Someone booking a slot or attending | Would see available time slots; no availability to set. |

### Suitability

- **Venue owner**  
  The plan fits: one schedule + overrides per venue, same as today. No change to mental model. **Suitable.**

- **Event creator / host**  
  The plan introduces **host availability** as a first-class resource. Today the app does **not** check “is the event creator free?” — only venue and facilitator. For many events the creator *is* the venue owner, so “venue free” already implies they’re there. **Recommendation:** Treat host as **optional** in combined APIs: if `hostId` is omitted, only venue (and facilitators, if any) are considered. That keeps “venue-only” and “venue + facilitator” flows working as today, and allows adding “host must be free” only where needed (e.g. events at someone else’s venue).

- **Facilitator**  
  Unified model (recurring + overrides) is more powerful than today’s “list of date/time slots.” Some facilitators are casual (“I’m free these three dates”); others have a pattern (“every Tuesday 6–8pm”). The **same data model** supports both (recurring slots + one-off slots + overrides). **Recommendation:** Keep one model; in the **UI** offer a **simple path** (e.g. “Add a date” / “Add times for this day”) alongside the full “Working hours + date overrides” so casual facilitators aren’t forced into a calendar-style setup. **Suitable** if we avoid UI overload.

- **Community member**  
  Member availability is **informational** (heatmap, “how many people free on this date”) and not used to block or book. The plan does **not** sync members into the combined event engine, and that’s correct: we should **not** require every member to have a full schedule + overrides. **Recommendation:** Keep **member availability out of scope** for the “synced” engine. Leave it as a separate, lightweight “mark my available dates/times” for the community. No need for recurring schedule or overrides for members unless we later add “book a time with this member.”

- **Guest / booker**  
  Plan is suitable: they see slots derived from venue (and optionally host + facilitator); they don’t set availability.

### Usability

- **One profile per user, not per role**  
  Today Profile has both **MyAvailability** (unified USER profile) and **FacilitatorAvailabilityManager** (legacy). That’s two places for “when I’m available.” The plan should assume **one USER availability profile per user**, used both when that user is acting as “host” and when they’re acting as “facilitator.” So we don’t have “host availability” and “facilitator availability” as separate data; we have “user availability,” and we pass the same `userId` when checking host or facilitator. **Usability gain:** One place to maintain; no “which availability did I set where?”

- **Optional “use my venue’s hours” for hosts**  
  When the event creator owns the venue, they might not want to maintain two schedules (venue + personal). An option like “Use my venue’s availability as my host availability” (or default to that when host owns the only selected venue) reduces duplicate entry. **Recommendation:** Add to Phase 3 or later: when computing host availability, allow “inherit from venue V” so one schedule drives both.

- **Combined API: all parameters optional**  
  Events can be: venue-only (no facilitator), facilitator-only (no venue, e.g. virtual), or venue + facilitator. So `checkEventAvailability` and `getEventAvailabilitySlots` should treat **venueId, hostId, and facilitatorIds as optional** and intersect only the resources that are provided. That keeps “just venue” and “venue + at least one facilitator” flows simple and avoids forcing host into every call.

- **Clear labels in UI**  
  To avoid confusion between “my availability” and “my venue’s availability”: use copy like “When **you’re** available to host” (Profile) vs “When **this venue** is available” (PlaceDetail). For facilitators: “When you’re available to facilitate” (or keep under one “Your availability” that applies to both).

- **Slots-first event creation (Phase 2)**  
  Today HostEvent is **date/time-first**: user picks date/time, then sees which places/facilitators are available. The plan’s “pick date → see slots → pick slot” is better for discoverability (“when can we do this?”) and matches Calendly/Doodle. We should move to **slots-first** in the event creation flow when we add `getEventAvailabilitySlots`: choose venue (and optionally facilitator), then date, then show a list of time slots. **Usability:** Reduces “no places available” dead-ends; user sees only valid options.

### Summary of re-assessment

| Aspect | Conclusion |
|--------|------------|
| **Venue owner** | Plan is suitable and usable; keep as-is. |
| **Host** | Make host **optional** in combined APIs; consider “inherit from venue” to reduce double entry. |
| **Facilitator** | One USER profile for both host and facilitator; offer **simple UI** (add date/times) as well as full schedule so casual users aren’t overwhelmed. |
| **Member** | **Out of scope** for sync; keep member availability as a separate, lightweight feature. |
| **Combined API** | All of **venueId, hostId, facilitatorIds** optional; intersect only what’s provided; support “at least one facilitator” when multiple facilitators. |
| **Terminology** | “Your availability” (Profile) vs “This venue’s availability” (PlaceDetail); one profile per user. |

No change to the core data model or sync semantics; the re-assessment only refines **optional vs required** in the combined APIs, **scope** (members excluded from sync), and **usability** (one profile per user, optional inheritance, slots-first flow, and clear labels).

**UI plan:** A detailed UI plan for the availability engine (venue first, then host/facilitator, member, guest) is in [AVAILABILITY_UI_PLAN.md](./AVAILABILITY_UI_PLAN.md).  
**Back-end plan:** Database schema and API endpoint architecture for the availability engine are in [AVAILABILITY_BACKEND_PLAN.md](./AVAILABILITY_BACKEND_PLAN.md).

---

## 7. References

- Calendly: [How to set your availability](https://help.calendly.com/hc/en-us/articles/14074797893143), [Fine-tune availability](https://help.calendly.com/hc/en-us/articles/1500004754122), [Date overrides (community)](https://community.calendly.com/how-do-i-40/over-ride-set-scheduling-hours-832).
- Acuity: [Managing availability and calendars](https://help.acuityscheduling.com/hc/en-us/articles/16676883635725), [Pooling calendar availability](https://help.acuityscheduling.com/hc/en-us/articles/16676903042829).
- Doodle: [Availability sheet](https://doodle.com/en/availability-sheet/), [Availability calendar](https://doodle.com/en/availability-calendar/), [Booking page guide](https://doodle.com/en/resource/how-to/guide-to-booking-page/), [Create booking page](https://doodle.com/en/booking-creation/), [Group poll](https://help.doodle.com/en/articles/9457353-how-do-i-create-a-group-poll).
- Partiful: Event/RSVP help; no dedicated availability engine docs used.
