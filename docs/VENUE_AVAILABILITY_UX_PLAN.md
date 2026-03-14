# Venue Availability Engine & UI – Research, Plan & Code Plan

## 1. Research: How Other Venue Platforms Do It

### 1.1 Airbnb / VRBO (Short-term rentals)

- **Calendar model**: Vertically scrolling month view; select **date range** (check-in → check-out). Current date always marked; month navigation clear.
- **Host side**: Toggle dates as **Open** or **Block**; popup on date(s) with “Block” / “Open”. Support for advance notice, buffer between bookings, min/max stay, **recurring blocks** (e.g. every week).
- **Data**: Availability often loaded on page load; APIs return daily status and check-in/checkout validity (e.g. VRBO up to 3 years). Sync with external calendars (e.g. iCal) common but can have delay.

### 1.2 Peerspace (Spaces / venues)

- **Host side**: Two main actions — **external calendar sync** (iCal, Google) and **manual “Block Time”** for dates/times booked elsewhere or unavailable.
- **UX**: “Block Time” is explicit and primary; confirmed bookings auto-block. Emphasis on **calendar accuracy** for search ranking and fewer messages.
- **Guest side**: Search/filter by availability; accurate calendar = better visibility.

### 1.3 Calendly / Acuity (Scheduling)

- **Host side**: Set **recurring available hours** (e.g. Mon–Fri 9–5) per calendar; then **block off** specific times (single or recurring weekly blocks). Connected calendars (e.g. Google “Busy”) also block slots.
- **Guest side**: See **available time slots** (e.g. 15/30 min); often **date first**, then **time slots** for that day; some use 5-day view to reduce steps.
- **Best practices**: Common intervals (15/30 min); show availability early; pre-select next available; collect personal info after slot selection; mobile-first.

### 1.4 Design principles (synthesis)

| Principle | Application for venue availability |
|----------|-------------------------------------|
| **One place to manage** | Single calendar/settings area for “when is this venue available” — not two separate UIs (recurring vs one-off). |
| **Block vs Open** | Familiar mental model: default “closed” or “not set”; host **opens** slots or **blocks** dates/times. |
| **Recurring first** | Set “every Mon/Wed 9–5” then override with one-off blocks or one-off openings. |
| **Visual state** | Clear states: Available / Blocked / Booked; legend and consistent colours. |
| **Fewer steps** | Bulk actions (e.g. “Block this week”, “Open weekends”), month navigation, optional sync. |
| **Guest-facing** | Show “available” vs “unavailable” (or slots) without host-only complexity. |

---

## 2. Current State (This Codebase)

### 2.1 Two parallel systems

| System | API | UI on Place (venue) page | Data model |
|--------|-----|---------------------------|------------|
| **Legacy** | `api/availability.js`: `getPlaceAvailability`, `createPlaceAvailability`, `deletePlaceAvailability` | **PlaceAvailabilityManager** – list of date + start/end slots; “Add Availability” form (date, start time, end time) | Flat list of slots per place |
| **Unified** | `api/availability-unified.js`: `getVenueAvailability`, slots + overrides, `createAvailabilitySlot`, `createAvailabilityOverride` | **VenueAvailabilityCalendar** – month grid; click day → modal “Add Availability” or “Block Date” | Profile (VENUE) + **recurring slots** (dayOfWeek + period) + **overrides** (date-specific BLOCKED/BOOKED) |

- **PlaceDetail** (host venue management) shows **both** VenueAvailabilityCalendar and PlaceAvailabilityManager.
- **HostEvent** uses only **legacy** `getPlaceAvailability(placeId, date)` to decide if a place is available for a chosen date/time.
- **Result**: Confusing for hosts (two calendars), and venue availability used for event creation is **only** from the legacy system; unified engine is not used for that flow.

### 2.2 Pain points

1. **Duplicate UIs**: Two different tools for “when is my venue available” (calendar vs list form).
2. **Split data**: Recurring rules in unified; one-off slots in legacy; HostEvent only reads legacy.
3. **Calendar UX**: Single-month grid; no bulk block/open; no “default weekly hours”; modal on every click; “Add Availability” on a day creates a **one-off** slot in unified but slot model is day-of-week (conceptually recurring).
4. **No “weekly template”**: Hosts can’t set “Mon–Fri 9–5” in one go; they must add slot by slot or day by day.
5. **Unified slot semantics**: `createAvailabilitySlot` with `date` + `dayOfWeek` mix one-off and recurring in one type; VenueAvailabilityCalendar passes `date` so it creates date-specific slots, but mock stores dayOfWeek-based recurring slots — confusing.
6. **Guest view**: VenueDetail doesn’t show an availability/calendar widget; only booking CTA.

---

## 3. Product/UX Plan (What to Build)

### 3.1 Single “Venue availability” experience on venue (place) pages

- **One section** on the host’s place/venue page: **“Availability”**.
- **One engine** backing it: unified availability (recurring + overrides); legacy place availability should be retired or bridged so HostEvent uses the same engine.

### 3.2 Host flows (easy to use)

1. **Set default weekly hours**
   - Form: “Your venue is available…” with **recurring** pattern:
     - Days: Mon, Tue, Wed, Thu, Fri, Sat, Sun (checkboxes).
     - Time range: e.g. 9:00 AM – 5:00 PM (one or more ranges per day).
   - Optional: “Same hours every day” shortcut.
   - Saves as **recurring slots** (dayOfWeek + startTime/endTime) in unified engine.

2. **Calendar view**
   - **Month grid** (keep current layout, improve styling).
   - **States per day**: Available (green), Blocked (grey), Booked (red), Not set (neutral).
   - **Click day** → small **day panel** (inline or side panel, not full-screen modal):
     - Show that day’s slots (from recurring or one-off) and any override.
     - Actions: **“Block this day”** | **“Open this day”** (use default hours or custom time) | “Edit” for existing.
   - **Bulk**: “Block date range” (e.g. 1–7 Dec) and “Clear block” for range.

3. **Sync / blocks**
   - Optional later: “Block times from Google Calendar” (sync).
   - For now: manual “Block this day” / “Block range” is enough.

4. **Booked state**
   - When a booking exists for a date (from bookings API or mock), show **Booked** and optionally disable “Open” for that time.

### 3.3 Guest-facing (venue listing / booking)

- On **VenueDetail** (public listing): show a **read-only** availability widget:
  - Either “Available / Unavailable” by date for next 1–2 months, or
  - “Next available” dates / time slots (e.g. “Select date” then “Select time”).
- Keeps UX simple and consistent with “show availability upfront” best practice.

### 3.4 Event creation (HostEvent)

- **Single source of truth**: Use **unified** venue availability only.
  - `checkVenueAvailability(venueId, date, startTime, endTime)` already exists in unified API.
  - HostEvent should call unified API (or a facade that uses it) instead of legacy `getPlaceAvailability`.
- Deprecate or remove legacy place-availability usage for “is this place free at this time?”.

---

## 4. Code Plan

### 4.1 Data / API (unified only for venues)

- **Keep**: `getVenueAvailability(venueId)`, `checkVenueAvailability(venueId, { date, startTime, endTime })`, `createAvailabilitySlot`, `createAvailabilityOverride`, `deleteAvailabilitySlot`, `deleteAvailabilityOverride`.
- **Clarify slot semantics** in mocks/backend:
  - **Recurring slot**: `dayOfWeek` set, `date` null → “every Monday 9–5”.
  - **One-off slot**: `date` set, `dayOfWeek` optional → “only on 2025-03-15 9–5”.
  - VenueAvailabilityCalendar “Add Availability” for a day: create **one-off** slot with that `date` and times, or “Apply to every [weekday]” to create recurring.
- **Bridge or remove legacy**: Either:
  - **Option A**: HostEvent calls `checkVenueAvailability(placeId, …)` (unified) and we stop using `getPlaceAvailability` for filtering; then remove or hide PlaceAvailabilityManager and legacy place availability from host UI.  
  - **Option B**: Keep legacy API for backward compatibility but have it **read from** unified venue availability (same profile/slots/overrides) so one source of truth; then merge UIs.
- **Recommendation**: Option A — use unified only; remove PlaceAvailabilityManager from PlaceDetail; ensure unified mock (and future backend) creates VENUE profile for placeId so `getVenueAvailability(placeId)` works.

### 4.2 Components (host venue page)

| Component | Purpose | Changes |
|-----------|---------|--------|
| **VenueAvailabilityCalendar** | Main host calendar | Keep month grid; improve day panel (inline or side panel instead of full modal); add **“Block range”**; show today; clearer legend; optional week-start (locale). |
| **WeeklyHoursForm** (new) | Set default recurring hours | New component: day checkboxes + time range(s); writes recurring slots via `createAvailabilitySlot` (dayOfWeek, no date). |
| **PlaceAvailabilityManager** | Legacy list + form | **Remove** from PlaceDetail once HostEvent uses unified; or repurpose as “One-off slots” list only (no duplicate with calendar). Prefer **remove** and do one-off from calendar day panel. |

### 4.3 PlaceDetail page

- **Single “Availability” card/section** containing:
  1. **WeeklyHoursForm** at top: “Default weekly hours” (recurring).
  2. **VenueAvailabilityCalendar** below: month grid + day panel + “Block date range”.
- Remove **PlaceAvailabilityManager** from this page.

### 4.4 HostEvent page

- Replace `getPlaceAvailability(placeId, date)` (+ per-place batch) with:
  - For each place: `checkVenueAvailability(place.id, { date: selectedDate, startTime: selectedStartTime, endTime: selectedEndTime })`.
- Use returned `available` (and optionally `conflicts` / `matchingSlots`) to compute `availablePlaces`.
- Remove dependency on `api/availability.js` for place availability in this flow.

### 4.5 Guest venue page (VenueDetail)

- Add **VenueAvailabilityPreview** (new): read-only calendar or “Next available” that calls `getVenueAvailability(venueId)` (or a lightweight “availability by date” endpoint) and shows Available / Blocked / Booked for next 4–8 weeks. No edit actions.

### 4.6 File-level plan

| File | Action |
|------|--------|
| `src/pages/PlaceDetail.jsx` | Remove PlaceAvailabilityManager; keep only VenueAvailabilityCalendar; add WeeklyHoursForm above it. |
| `src/components/availability/VenueAvailabilityCalendar.jsx` | Refactor: day panel as side/inline panel; add “Block range”; add “Block this day” / “Open this day”; ensure slot creation uses correct one-off vs recurring; improve a11y and mobile. |
| `src/components/availability/WeeklyHoursForm.jsx` | **New**: recurring weekly hours form; calls createAvailabilitySlot for each day+range (dayOfWeek, no date). |
| `src/components/PlaceAvailabilityManager.jsx` | Stop rendering on PlaceDetail; optionally delete later or keep for a different context (e.g. “legacy” admin). |
| `src/pages/HostEvent.jsx` | Switch to checkVenueAvailability (unified); remove getPlaceAvailability for filtering; adjust loading/error handling. |
| `src/api/availability-unified.js` | No change to public API; ensure demo creates VENUE profile for place when needed. |
| `src/mocks/availability-unified.js` | Ensure createMockAvailabilitySlot supports both recurring (dayOfWeek, date null) and one-off (date set); getMockVenueAvailability / checkMockVenueAvailability consider both. |
| `src/pages/VenueDetail.jsx` | Add VenueAvailabilityPreview (read-only) for guests. |
| `src/components/availability/VenueAvailabilityPreview.jsx` | **New**: read-only calendar or list of next available dates; uses getVenueAvailability. |

### 4.7 Unified mock: slot semantics

- In `createMockAvailabilitySlot`:
  - If `date` is provided → one-off slot (that date only); store and use in `getMockVenueAvailability` / `checkMockVenueAvailability` for that date.
  - If `dayOfWeek` is provided and no `date` (or date only for “which weekday”) → recurring; use for every matching weekday in `checkMockVenueAvailability`.
- In `getMockVenueAvailability(venueId)`: return both recurring slots and one-off slots (e.g. slots with `date` set) so the UI can show “this day has a one-off slot” or “this day uses recurring”.

---

## 5. Implementation Phases

### Phase 1 – Single engine and host UX (foundation)

1. **Unified only for venue checks**  
   - HostEvent: use `checkVenueAvailability(placeId, …)` instead of `getPlaceAvailability`.  
   - Ensure unified mock returns sensible results for VENUE placeId (create profile on first slot/override if needed).

2. **VenueAvailabilityCalendar improvements**  
   - Replace full-screen modal with compact **day panel** (below or beside grid).  
   - Day panel: show slots/overrides for that day; actions: “Block this day”, “Open with default hours”, “Open with custom times”, “Cancel”.  
   - Add “Block date range” (from–to) creating overrides for each day in range.

3. **WeeklyHoursForm**  
   - New component: select days, set one time range (e.g. 9–5); “Save” creates recurring slots (dayOfWeek, startTime, endTime) for venue.  
   - On load, pre-fill from existing recurring slots.

4. **PlaceDetail**  
   - Remove PlaceAvailabilityManager.  
   - Add WeeklyHoursForm above VenueAvailabilityCalendar.  
   - One “Availability” section only.

### Phase 2 – Polish and guest view

5. **Calendar polish**  
   - Mark “today”; improve legend and colours; optional week start (Sun/Mon); mobile layout.

6. **VenueAvailabilityPreview**  
   - Read-only component for VenueDetail; show availability for next 4–8 weeks (e.g. dots or small grid).  
   - Data: `getVenueAvailability(venueId)` and derive per-day status for display.

### Phase 3 – Cleanup (optional)

7. **Legacy**  
   - Remove or hide PlaceAvailabilityManager everywhere.  
   - Deprecate `getPlaceAvailability` / `createPlaceAvailability` / `deletePlaceAvailability` for venue availability (or keep only for non-venue use if any).  
   - Update docs (AVAILABILITY_CALENDARS.md, AVAILABILITY_STATUS.md) to describe single engine and new UX.

---

## 6. Summary

- **Research**: One place to manage, block vs open, recurring first, clear states, fewer steps (bulk, weekly template).  
- **Current**: Two UIs and two APIs (legacy + unified); HostEvent uses legacy only; no weekly template, no guest availability preview.  
- **Plan**: One “Availability” section on venue page (WeeklyHoursForm + VenueAvailabilityCalendar); HostEvent uses unified only; day panel instead of big modal; block range; read-only guest preview.  
- **Code**: New WeeklyHoursForm and VenueAvailabilityPreview; refactor VenueAvailabilityCalendar; remove PlaceAvailabilityManager from PlaceDetail; switch HostEvent to checkVenueAvailability; clarify one-off vs recurring in mocks.

This plan makes venue availability easy to use (one place, clear actions, recurring + overrides) and aligns with how other venue platforms present and manage availability.
