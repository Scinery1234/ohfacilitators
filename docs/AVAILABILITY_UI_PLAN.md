# Availability Engine: UI Plan

UI plan for the availability engine, **venue first**, then host, facilitator, member, and guest/booker. Aligns with the data model and API plan in [AVAILABILITY_ENGINE_RESEARCH.md](./AVAILABILITY_ENGINE_RESEARCH.md). Back-end (database and endpoints) is planned in [AVAILABILITY_BACKEND_PLAN.md](./AVAILABILITY_BACKEND_PLAN.md).

---

## 1. Venue availability UI

**Audience:** Venue owner (or collaborator) who manages when their place is available.

**Location:** Place detail page → **Manage availability** (button) → scroll to **#availability** section.  
Route: `/my-places/:id` (or equivalent place detail for the owner).

### 1.1 Structure and copy

| Element | Copy / behavior |
|--------|------------------|
| **Section heading** | “Availability schedule” |
| **Intro** | “Set when your venue is available by default, then block or open specific dates below.” |
| **Subsection 1** | “Working hours (recurring)” |
| **Subsection 2** | “Date overrides” |

### 1.2 Working hours (recurring)

**Component:** `WeeklyHoursForm` (existing).

**UI:**
- Short description: recurring default hours; date overrides live in the calendar below.
- **Day checkboxes:** Sun–Sat (user picks which days the venue is “on”).
- **One time range:** Start time and end time (e.g. 09:00–17:00) applied to all selected days.
- **Primary action:** “Save schedule” (replaces existing recurring slots with the new selection).
- **Feedback:** Success message after save; optional inline validation (e.g. end after start).

**Data:** Unified API — `getVenueAvailability(venueId)`, `createAvailabilitySlot` / `deleteAvailabilitySlot` for recurring slots (`date: null`, `dayOfWeek` set).

### 1.3 Date overrides

**Component:** `VenueAvailabilityCalendar` (existing), extended as below.

**UI:**
- **Heading:** “Date overrides”
- **Subtitle:** “Block dates or specific times (unavailable), or open a specific date outside your working hours. Click a day to change it.”
- **Month calendar:** Current month by default; “Previous month” / “Next month” (and optional “This month”).
- **Day states (visual):**
  - **Default (no override):** Neutral (follows working hours).
  - **Has availability this day (from working hours):** e.g. subtle “available” style.
  - **Fully blocked:** e.g. distinct “blocked” style (red/gray).
  - **Partially blocked:** e.g. dot or stripe indicator (some time windows blocked).
  - **Opened (one-off):** e.g. “open” style (e.g. green/blue) for dates that are available only via override.
- **Click a day → inline day panel** (below or beside calendar):
  - Show **“Time blocks on this day”**: a single list of all segments (available windows from working hours + one-off slots; blocked windows from overrides). See **§1.3.1–1.3.2** for how other tools do this and our pattern (list + “Add available window” / “Add blocked window” + optional mini timeline).
  - If day **has no** recurring availability: list is empty or only one-off/blocked; “Add available window” opens the day.
  - If day **has** recurring availability: list shows the default hours as “From working hours” plus any one-off slots and any blocked overrides.
  - **Block this day:** one-click full-day BLOCKED override (00:00–23:59); appears as one row in the list.
  - **Add available window** / **Add blocked window:** inline start/end + “Add” for multiple separate available or blocked slots per day; no modal.
  - Each one-off available slot and each override has **Remove** so the host can delete a single block.
- **Block range (optional):** “Block a date range” with From date and To date; “Block” creates full-day BLOCKED overrides for each date in range (skip already blocked), with clear success message.
- **Empty state:** “Set your working hours above first, then use this calendar to add date overrides (block or open specific dates).”
- **Errors:** If load fails, show message and “Try again.”

**Data:** `getVenueAvailability` (slots + overrides), `createAvailabilityOverride`, `deleteAvailabilityOverride`, `createAvailabilitySlot` (for one-off “open” slots). Overrides support `date` + `startTime` + `endTime` so both full-day and partial-day blocks are supported.

#### 1.3.1 How other tools handle multiple blocks per day

So the host can set **multiple separate time slots as available or unavailable on one day** without a clunky flow, here’s how similar products do it:

| Product | Pattern | Pros | Cons |
|--------|---------|------|------|
| **Acuity** | One field per day: **comma-separated time ranges** (e.g. “8 AM – 1 PM, 2 PM – 5 PM”). One string for “available” windows; blocks are separate. | Fast for power users; no extra clicks. | Less visual; easy to mistype; no explicit “blocked” segments in the same field. |
| **Cal.com** | **Add slot** per day: click to add another time range to a day. “Copy times to” other days. Each day has a list of time boxes. | Clear “add another” mental model; copy to other days reduces repetition. | Can feel like many clicks if many days need the same split. |
| **Google Calendar (appointment schedule)** | **“Add another period to this day”** link. Each period has start/end. List of periods per day. | Simple list; explicit. | Very form-like; not visual. |
| **Calendly** | **Date-specific hours**: add date + time range(s); connected calendar for “busy” blocks. Multiple windows per date via multiple entries. | Fits “override” model; calendar sync for blocks. | Not a single “day view” of all blocks; more about overrides per event type. |
| **Time-blocking apps** (e.g. Time Blocker, Schedually) | **Visual timeline** for the day: horizontal strip (e.g. 6am–10pm), blocks as colored bars; drag to resize, click to add. | Very intuitive; see the day at a glance; no form feel. | Heavier to build; needs good mobile behavior. |

**Takeaways:** (1) A **list of blocks** (each with start/end and type) is familiar and works well. (2) **“Add available” / “Add blocked”** keeps the two actions clear. (3) A **mini timeline** for the selected day (bars for each block) adds clarity and looks good without needing full drag-and-drop. (4) Avoid modals per block; keep add/edit **inline** in the day panel.

#### 1.3.2 Our pattern: multiple blocks on one day (intuitive, non-clunky, aesthetic)

**Goal:** On a selected day, the host can see and edit **all** time blocks (available and unavailable) in one place, add or remove blocks without wizards or extra steps, and get a clear visual of the day.

**Day panel layout when a day is selected:**

1. **Header:** “Tuesday, 18 March” (or “18 Mar”) with a short line: “Time blocks on this day.”
2. **Unified list — “Time blocks on this day”**  
   One list showing every segment that applies to this day:
   - **Available:** From recurring working hours (read-only, with hint “From working hours” or “Default hours”) and from **one-off slots** for this date (each with start, end, “Remove”).
   - **Blocked:** From overrides with `status: 'BLOCKED'` for this date (each with start, end, “Remove”). Full-day block shown as “All day” or “00:00 – 23:59”.

   Each row: a small **type pill** (e.g. “Available” in green, “Blocked” in red/gray), **start time – end time** (compact, e.g. “9:00 – 12:00”), optional **“Remove”** (for one-off available slots and for any blocked override). No modal: remove deletes that block; add flows below.
3. **Add controls (inline, same panel)**  
   - **“Add available window”:** Inline start/end time inputs (or a single row with two time pickers) + “Add”. Creates a one-off availability slot for this date.  
   - **“Add blocked window”:** Same pattern: start + end + “Add”. Creates a BLOCKED override for this date.  
   So the host can add several available windows (e.g. 9–12, 14–17) and several blocked windows (e.g. 12–14) in any order; the backend already supports multiple slots and multiple overrides per day.
4. **Optional: mini timeline**  
   Below the list, a **horizontal strip** for this day (e.g. 06:00–22:00): each block (available or blocked) shown as a colored bar (available = one color, blocked = another). Bars are read-only in v1 (no drag-to-resize); they mirror the list and give an at-a-glance view. Improves clarity and aesthetics without complex interaction.
5. **Shortcuts**  
   - **“Block this day”** still adds one full-day blocked override (00:00–23:59) and stays visible as one list row.  
   - If the day has **no** recurring availability, the list only shows one-off slots and blocks; “Add available window” is the way to open the day.

**Anti-clunk:**  
- No modal per block; add and remove happen in the same panel.  
- One list for “this day” so the host doesn’t switch context.  
- Time inputs: compact (e.g. two dropdowns or time inputs in one row), not a long form.  
- Optional timeline is visual only (no drag) in the first version to keep implementation simple.

**Aesthetic:**  
- Consistent spacing and typography; type pills (Available / Blocked) with subtle background; list rows with light dividers or cards.  
- Mini timeline: rounded bar ends, clear color difference (e.g. green vs red/gray), labels on hover or under the strip.  
- Same pattern reused for **user** (Profile) availability so venue and host/facilitator feel consistent.

### 1.4 Slot preview and search by time-slot

**Slot preview (see timeslots on a specific day)**  
When a day is selected in the calendar, show a **“Preview: Available slots on [date]”** block (e.g. below the day panel). Call `getVenueAvailabilitySlots(venueId, selectedDate, { durationMinutes, incrementMinutes })` and display the resulting slots in a clear list or grid (e.g. “9:00 AM”, “9:30 AM”, “10:00 AM”, …). This gives the host an immediate view of what bookable slots look like for that day. Empty state: “No slots available on this day” (e.g. day blocked or outside working hours).

**Search by time-slot (which days is a window available)**  
Provide a **“Filter by time window”** (or “Show days when this time is available”) control: the host enters a start and end time (e.g. 14:00–16:00). The UI then highlights or filters the visible month so that only days where the venue is available for that entire window are emphasized (or listed). Backend: support an endpoint such as `getVenueAvailabilityByWindow(venueId, dateFrom, dateTo, startTime, endTime)` returning `{ dates: ['YYYY-MM-DD', ...] }` for days in the range where the venue is available for the given time window. Alternatively the client can call `checkVenueAvailability(venueId, date, startTime, endTime)` for each day in the month.

### 1.5 Visual design (venue and overall)

- **Calendar:** Clear typography and spacing; distinct but not overwhelming colors for available / blocked / partially blocked / opened. Use borders or subtle backgrounds to separate the calendar from the day panel and slot preview.
- **Day panel:** Compact layout; group “Block this day” and “Block a time window” with clear labels; list overrides for the day with remove buttons so the host can edit without opening another screen.
- **Slot preview:** List or grid of time chips/buttons (e.g. pill style); optional 12h/24h preference; loading state while fetching slots.
- **Responsive:** On small screens, stack calendar → day panel → slot preview vertically; consider a drawer or bottom sheet for the day panel on mobile.
- **Accessibility:** Sufficient contrast; `aria-label` on calendar and controls; keyboard navigation for calendar and slot list; announce selected date and slot count in the preview.

### 1.6 Entry point

- On place detail, visible to owner/collaborator: **“Manage availability”** button linking to `#availability` so the full section (working hours + date overrides) is in one place.

### 1.7 Summary (venue)

| Block | Component | Purpose |
|-------|-----------|---------|
| Working hours | `WeeklyHoursForm` | Set default recurring weekly hours |
| Date overrides | `VenueAvailabilityCalendar` | Block/open full days; **multiple blocks per day** (list + Add available/Add blocked + optional mini timeline); remove overrides |
| Slot preview | Slot list (from `getVenueAvailabilitySlots`) | Show bookable slots on the selected day |
| Search by time-slot | Filter/highlight (from `getVenueAvailabilityByWindow` or per-day check) | Show which days have a given time window available |

---

## 2. Host / “Your” availability UI (same as facilitator)

**Audience:** Logged-in user who may host events or act as facilitator. One **user availability profile** drives both “host” and “facilitator” availability.

**Location:** **Profile** page. One section: “Your availability” (no separate “host” vs “facilitator” sections).

### 2.1 Structure and copy

| Element | Copy / behavior |
|--------|------------------|
| **Section heading** | “Your availability” |
| **Intro** | “When you’re available to host or facilitate. This is used when someone checks if you’re free for an event or a slot.” |
| **Subsection 1** | “Working hours (recurring)” |
| **Subsection 2** | “Date overrides” |

Same mental model as venue: **recurring first**, then **date overrides** for exceptions.

### 2.2 Working hours (recurring) for user

**Component:** Reuse the same pattern as `WeeklyHoursForm` but for `ownerType: 'USER'`, `ownerId: user.id`. Can be a shared component (e.g. `RecurringHoursForm`) that accepts `ownerType` and `ownerId`, or a dedicated `UserWeeklyHoursForm` that calls `getUserAvailability` / user slot APIs.

**UI:**
- Day checkboxes (Sun–Sat).
- One start/end time range for selected days.
- “Save schedule” (replaces recurring user slots).
- Optional short hint: “Use this for both hosting and facilitating; you can override specific dates below.”

### 2.3 Date overrides for user

**Component:** Same pattern as `VenueAvailabilityCalendar` but for user: load/save via user availability API (e.g. `getUserAvailability(userId)`, `createAvailabilityOverride` with `ownerType: 'USER'`, `ownerId`).

**UI:** Same structure as venue (§1.3, §1.3.2):
- Month calendar; click day → day panel with **“Time blocks on this day”**: one list of available windows (from working hours + one-off slots) and blocked windows (overrides).
- **Add available window** / **Add blocked window** (inline start/end + Add); **Block this day**; **Remove** per block.
- Optional **mini timeline** for the selected day (available vs blocked bars).
- Block range control same as venue.
- Copy adjusted to “you” (e.g. “Block dates when you’re unavailable”).
- Optional **slot preview** for selected day via `getUserAvailabilitySlots(userId, date)` so the user can see their own bookable slots.

### 2.4 Optional: “Use my venue’s hours”

For users who own at least one venue, show an optional checkbox or link: **“Use [Venue name]’s hours as my default”**. When enabled (and no custom user slots), the engine treats the user as available whenever that venue’s recurring schedule is available. Implementation: either copy venue slots to user on save, or have the API resolve “user availability” by delegating to venue when this option is set. Out of scope for initial UI; can be a Phase 2 enhancement.

### 2.5 Consolidation with existing Profile blocks

- **Remove or replace** the legacy **FacilitatorAvailabilityManager** (date+time list) once the unified “Your availability” (working hours + date overrides) is in place.
- **MyAvailability** (unified USER grid today) can be replaced by the same “Working hours + Date overrides” pattern so there is a single, consistent block: “Your availability” with recurring hours and calendar overrides.

### 2.6 Summary (host / user)

| Block | Component | Purpose |
|-------|-----------|---------|
| Working hours | Shared recurring form (USER) | Default weekly availability for the user |
| Date overrides | User availability calendar (USER) | Block or open specific dates for the user |

---

## 3. Facilitator availability UI

**Same as host:** One profile per user. “Your availability” on Profile is used both when the user is the **event creator/host** and when they are a **facilitator**. No separate facilitator-only UI.

**Optional — simple path for casual facilitators:** In the same “Your availability” section, offer two modes (or one combined surface):

- **Schedule mode (default):** Working hours + date overrides (as above). Best for “every Tue/Thu 6–8pm” plus occasional blocks.
- **Simple mode (optional):** “Add a date” → pick date, optional start/end → “Add”. Shows a list of one-off “I’m available” entries. Backed by the same unified model (one-off slots or overrides). This avoids forcing casual users into the full calendar.

**Discovery:** Facilitators reach this from **Profile**; event creators see “available facilitators” when creating an event (from the same user availability data).

---

## 4. Member availability UI (lightweight, out of sync engine)

**Audience:** Community member who wants to signal “when I’m generally available” for the community (e.g. for heatmap or scheduling polls). **Not** part of the synced host/facilitator/venue engine.

**Location:** **Community detail** page, for members of that community (e.g. “When you’re available” or “Your availability for this community”).

**Component:** `MemberAvailabilityMarker` (existing concept), kept lightweight.

**UI:**
- Short copy: “Mark dates when you’re available. This helps the community see when people are free (e.g. for events).”
- Simple list or small calendar: add a date (and optionally time range); remove date. No recurring “working hours” or full “date overrides” calendar unless we explicitly add it later.
- Data: Legacy or separate member-availability API (e.g. “mark available” per community + date). Not the unified USER profile used for host/facilitator.

**No change** to the synced engine plan: member availability stays informational only.

---

## 5. Guest / Booker UI (event creation and future booking)

### 5.1 Event creation (HostEvent) — slots-first

**Audience:** Event creator (host) choosing when to schedule an event. They may select a venue and/or facilitators; the UI should show only times when the selected resources are all available.

**Location:** Host Event page (e.g. `/host-event`).

**Flow (target):**
1. **Choose venue** (optional): dropdown “Place (optional)” — “No place” or list of user’s places.
2. **Choose community** (optional): dropdown “Community (optional)”.
3. **Choose facilitator(s)** (optional, if we add facilitator picker): e.g. multi-select from community facilitators or “any”.
4. **Choose date:** Date picker or small calendar (e.g. next 30–60 days).
5. **See time slots:** After date is selected, call `getEventAvailabilitySlots({ venueId?, hostId?, facilitatorIds?, date, options })`. Show a **list of time slots** (e.g. 9:00, 9:30, 10:00, …) — only slots where every selected resource is free. If no venue/facilitator selected, slots can be derived from host only or “any time” depending on product rules.
6. **Pick a slot:** User selects one slot → form’s start (and end) are set. Optional: before submit, call `checkEventAvailability` with the exact range to confirm.
7. **Submit:** Create event; backend creates BOOKED overrides for venue, host, and assigned facilitator(s) for that time.

**UI details:**
- **Slots list:** Same pattern as Calendly/Doodle: list or grid of buttons “9:00 AM”, “9:30 AM”, …; disabled or hidden if none.
- **Empty state:** “No slots available for this date with the selected place/facilitators. Try another date or change place/facilitators.”
- **Loading:** “Loading available times…” while `getEventAvailabilitySlots` runs.
- **Existing fields:** Title, description, image, capacity, visibility, etc. stay as today; only the “when” part becomes slots-first (date → slots → pick).

**Fallback:** Until combined API exists, keep current behavior: user picks date/time with a datetime field; show “available places” and “available facilitators” count for that time; no slot list yet.

### 5.2 Future: public booking page (venue or event)

**Audience:** Guest who wants to book a slot at a venue or for an event.

**UI (outline only):**
- Landing: venue (or event) name, short description, duration.
- Date picker → then list of **available time slots** from `getVenueAvailabilitySlots` (or event-specific slot API).
- Guest picks slot → form (name, contact, etc.) → confirm → booking created; BOOKED override created for that slot.

No detailed wireframes here; the same slot-based pattern (date → slots → pick) applies.

---

## 6. Component reuse and naming

| Component | Used for | Owner type |
|-----------|----------|------------|
| **Recurring hours form** (e.g. shared `WeeklyHoursForm` or `RecurringHoursForm`) | Venue working hours; User working hours | VENUE / USER |
| **Calendar overrides** (e.g. `VenueAvailabilityCalendar` / `UserAvailabilityCalendar` or one generic with `ownerType`/`ownerId`) | Venue date overrides; User date overrides | VENUE / USER |
| **Slot list** (new, for event creation or booking) | Show slots from `getEventAvailabilitySlots` or `getVenueAvailabilitySlots` | N/A (read-only) |

Recommendation: refactor so that:
- One **RecurringHoursForm** (or keep `WeeklyHoursForm` for venue and add a user variant that uses same layout) accepts `ownerType` + `ownerId` and calls the correct API.
- One **AvailabilityCalendar** (or two thin wrappers) accepts `ownerType` + `ownerId` and loads/saves overrides and one-off “open” slots for that resource.

---

## 7. Order of implementation (UI)

1. **Venue** — Already in place (PlaceDetail + Working hours + Date overrides). Only refine copy and behavior if needed.
2. **User (host/facilitator)** — Add “Your availability” on Profile: working hours (USER) + date overrides (USER). Replace or merge MyAvailability and FacilitatorAvailabilityManager into this.
3. **Event creation** — Switch HostEvent to slots-first: date → `getEventAvailabilitySlots` → show slots → pick slot; optionally add facilitator picker and use combined API.
4. **Member** — Leave as-is (MemberAvailabilityMarker on CommunityDetail); no unification with the engine.
5. **Booking page** — When product is ready, add public booking flow using the same slot list pattern.

---

## 8. Summary table

| User type    | Where | Main UI elements |
|-------------|-------|-------------------|
| **Venue**   | Place detail (#availability) | Working hours (recurring) + Date overrides calendar |
| **Host / Facilitator** | Profile | Your availability: Working hours (recurring) + Date overrides calendar (one profile, same data for both roles) |
| **Member**  | Community detail | Lightweight “mark my available dates” (unchanged; out of sync engine) |
| **Guest (event creation)** | Host Event page | Venue/community/facilitator pickers → Date → Time slots list → Pick slot |
| **Guest (booking)** | Future booking page | Date → Time slots list → Pick slot → Confirm |

This keeps the **venue** as the first and most complete availability UI, then **other users** (host/facilitator) on the same pattern, with **members** staying lightweight and **guests** seeing slot-based flows only.
