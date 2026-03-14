# Host availability flow – UX audit and improvements

## User flow tested

1. **Entry**: Host logs in → **My Places** (or Dashboard → My Places) → sees list of places.
2. **To availability**: Clicks a place → **Place detail** (Overview, Place Details, Events, Collaborators, Visibility) → scrolls to **Availability** section; or clicks **Availability** on the place card to jump to `#availability` on the same place page.
3. **Default hours**: In **Default weekly hours** card, host selects days (e.g. Weekdays quick-select), sets start/end time, clicks **Save default hours**.
4. **Calendar**: In **Calendar** card, host sees month grid (Available / Blocked / Booked / Not set), clicks a day → day panel below shows actions: **Open this day** (with time range), **Block this day**, or **Remove block** if blocked.
5. **Block range**: Host sets “Block date range” from/to, clicks **Block range** → sees success message and cleared inputs.

## Audit findings and improvements implemented

### 1. Discovery and navigation
- **Finding**: Availability was only reachable by scrolling to the bottom of Place detail; no direct path from the place card or header.
- **Change**: 
  - **Place detail**: Added **Manage availability** button next to Edit/Delete; it links to `#availability` and scrolls to the section.
  - **My Places**: Added **Availability** link on each place card → `/places/:id#availability`; Place detail scrolls to the Availability section when the hash is `#availability` (with `scroll-mt-6` for offset).

### 2. WeeklyHoursForm
- **Finding**: Stale error stayed after the user changed days or times; no quick way to select common patterns; day toggles lacked clear pressed state for assistive tech.
- **Change**: 
  - Clear error when toggling a day or changing start/end time.
  - **Quick select**: **Weekdays** (Mon–Fri), **All days**, **Clear**.
  - Day buttons use `aria-pressed={selectedDays.has(value)}` and a group label for the day row.

### 3. VenueAvailabilityCalendar
- **Past dates**: Clicking past dates was allowed and could confuse (“Open this day” for a past date).
  - **Change**: Past dates are disabled (dimmed, `cursor-not-allowed`), not clickable; day buttons have clearer `aria-label` including “past date” when relevant.
- **Time display**: 24h (e.g. 09:00 – 17:00) in the day panel.
  - **Change**: Times shown in 12h with AM/PM (e.g. 9:00 AM – 5:00 PM) via `formatTime12h()`.
- **Default vs one-off**: When a day was only from recurring slots, it wasn’t obvious.
  - **Change**: For slots that are recurring (`date == null`), the day panel shows “(default hours)” next to the time range.
- **Block range feedback**: No loading or success feedback.
  - **Change**: “Block range” button uses `loading={actionLoading}` (spinner + “Loading...”); on success, show “X day(s) blocked.” for 4 seconds and clear the from/to inputs.
- **Empty state**: With no default hours and no overrides, the calendar was all “Not set” with no guidance.
  - **Change**: When `slots.length === 0 && overrides.length === 0`, show hint: “Set default weekly hours above, then block or open specific dates here.”
- **Calendar grid a11y**: Empty leading cells used a disabled invisible button.
  - **Change**: Empty cells are non-focusable `<div aria-hidden="true">`; date buttons have `aria-label` (e.g. “15 March”).

### 4. Copy and consistency
- **Place detail**: “Manage availability” in the header.
- **My Places**: “Availability” on the card (short, scannable).
- **Block range**: Success message and loading state aligned with the rest of the flow.

## Summary of code changes

| Area | File(s) | Changes |
|------|---------|--------|
| Navigation | PlaceDetail.jsx | `useRef` + `useLocation`; scroll to `#availability` on hash; “Manage availability” link; `id="availability"` and `scroll-mt-6` on section. |
| Navigation | MyPlaces.jsx | “Availability” link to `/places/:id#availability`. |
| WeeklyHoursForm | WeeklyHoursForm.jsx | Clear error on day/time change; Weekdays / All days / Clear; `aria-pressed` and `aria-label` on day group. |
| VenueAvailabilityCalendar | VenueAvailabilityCalendar.jsx | `formatTime12h`; past dates disabled and styled; “(default hours)” for recurring slots; block-range success message and loading; empty-state hint; empty cells as `div` with `aria-hidden`; `aria-label` on date buttons and range inputs. |

## Recommendations for later

- **Mobile**: Test touch targets (day cells, quick-select, time inputs) on small screens; consider a larger tap area or a “Select date” then “Select action” flow on narrow viewports.
- **Confirmation**: Optionally confirm “Block this day” or “Block range” in a small modal for high-impact actions.
- **Sync**: If external calendar sync is added, surface it in the same Availability section (e.g. “Sync with Google Calendar”) so hosts have one place for all availability.
