# Host availability management – common sense audit

## Scope

- **Page**: Place detail (venue) when user can edit (owner/collaborator).
- **Section**: “Availability” – Default weekly hours (WeeklyHoursForm) + Calendar (VenueAvailabilityCalendar).

## Findings and fixes

### 1. Calendar out of sync after saving default hours

- **Issue**: Saving default weekly hours did not refresh the calendar. The calendar kept showing “Not set” for days that had just been set, until the page was reloaded.
- **Fix**: PlaceDetail now keeps an `availabilityRefresh` counter. WeeklyHoursForm accepts `onSaved` and calls it after a successful save. VenueAvailabilityCalendar accepts `refreshTrigger` and refetches when it changes. Saving default hours triggers a calendar refetch so the grid updates immediately.

### 2. Block date range allowed past dates

- **Issue**: Hosts could pick a “from” date in the past and block a range including past days, which is unnecessary and can be confusing.
- **Fix**: Block range validates that “from” is not before today and shows an alert if it is. The “from” date input uses `min={todayStr}` so the date picker discourages past dates.

### 3. Day panel: wrong default times and unclear action when day is already open

- **Issue**: Clicking an already-available day (from default hours) still showed 9:00–5:00 in the time fields; “Open this day” suggested opening a day that was already open.
- **Fix**: When a day is selected, the time inputs are pre-filled from that day’s first slot (default or one-off) when it exists. When the day has only default hours, the primary action label is “Add different hours” instead of “Open this day”.

### 4. Default hours: unclear that one time applies to all days and that save replaces existing

- **Issue**: Hosts might assume they could set different times per day in the form, or that saving would merge with existing default hours.
- **Fix**: Copy updated to: “The same times apply to all selected days; saving replaces any existing default hours. You can block or open specific dates on the calendar below.”

## Checked and left as-is

- **Same time for all selected days**: Single start/end for all days is intentional; different hours per day can be done via “Add different hours” on the calendar. No change.
- **Clear then navigate away**: Clearing days without saving leaves the form in an unsaved state; no “unsaved changes” warning. Consider for a later iteration.
- **Save with no changes**: Allowing Save when nothing changed just re-applies the same slots; harmless.
- **Past dates in calendar**: Already disabled (no click, dimmed). No change.
- **Booked vs blocked**: Booked days show a message and only “Close”; blocked days show “Remove block”. Logic is correct.
- **Empty state**: Hint “Set default weekly hours above…” when there is no availability. Kept as-is.

## Summary of code changes

| Area | Change |
|------|--------|
| PlaceDetail | `availabilityRefresh` state; `onSaved` passed to WeeklyHoursForm; `refreshTrigger={availabilityRefresh}` passed to VenueAvailabilityCalendar. |
| WeeklyHoursForm | `onSaved` prop; call `onSaved?.()` after successful save; updated description text. |
| VenueAvailabilityCalendar | `refreshTrigger` prop; refetch when `refreshTrigger` changes; pre-fill day panel times from selected day’s first slot; “Add different hours” when day has only default hours; block range: validate from ≥ today, `min={todayStr}` on from input. |

---

## Second common-sense audit – findings and fixes

### 1. Calendar load failure was invisible

- **Issue**: If `getVenueAvailability` failed, the error was only logged; the UI showed an empty calendar with no explanation or way to retry.
- **Fix**: Added `loadError` state. On load failure we show the error message and a "Try again" button instead of the calendar.

### 2. Block range: "To" date could be before "From"

- **Issue**: User could pick a "to" date earlier than "from"; we only caught it on submit with an alert.
- **Fix**: The "to" date input now has `min={blockRangeFrom || todayStr}` so the date picker won't offer invalid "to" dates.

### 3. Block range: duplicate overrides for already-blocked dates

- **Issue**: Blocking a range that included already-blocked days created a second BLOCKED override per day, cluttering data and counts.
- **Fix**: In the block-range loop we skip any date that already has a BLOCKED override; only new blocks are created. Success message when count is 0: "No new days blocked (range was already blocked or empty)."

### 4. Day panel time inputs had no accessible labels

- **Issue**: The two time inputs in the day panel had no names for assistive tech.
- **Fix**: Added `aria-label="Start time for this day"` and `aria-label="End time for this day"` to the inputs.

### 5. No quick way back to current month

- **Issue**: After moving to another month, there was no one-click way to return to the current month.
- **Fix**: Added a "This month" button between Prev and Next that sets the calendar to the current month (with title "Go to current month").

### Summary of second-audit code changes

| Area | Change |
|------|--------|
| VenueAvailabilityCalendar | `loadError` state; on load failure show message + "Try again"; block range: `min={blockRangeFrom \|\| todayStr}` on "to" input; skip already-blocked dates in range and show "No new days blocked" when count 0; aria-labels on day panel time inputs; "This month" button. |
