# Availability Features Implementation Plan

## Overview
Implement complete availability system: API functions, event creation integration, and management UI.

---

## Implementation Steps

### STEP 1: Create Frontend API Functions
**Goal:** Create `src/api/availability.js` with all availability endpoints

**Tasks:**
- Create API functions for place availability (get, create, delete)
- Create API functions for facilitator availability (get, create, delete)
- Create API functions for member availability (get, create, delete)
- Handle errors gracefully
- Match backend API structure

**Files:**
- `src/api/availability.js` (new)

---

### STEP 2: Integrate Availability into Event Creation Flow
**Goal:** Show available places, facilitators, and member counts when creating events

**Tasks:**
- Update `HostEvent` page to fetch availability when date/time is selected
- Filter places list to show only available places
- Display available facilitators for selected date
- Show member availability count for selected date/community
- Add visual indicators for availability status
- Handle loading states

**Files:**
- `src/pages/HostEvent.jsx` (modify)

**User Flow:**
1. User selects date/time
2. System fetches availability for that date/time
3. Places dropdown shows only available places (or indicates "No available places")
4. Shows list of available facilitators
5. Shows member availability count

---

### STEP 3: Create Place Availability Management UI
**Goal:** Allow place hosts to set/manage venue availability

**Tasks:**
- Create availability management component/page
- Add calendar/date picker for selecting dates
- Add time range picker (start/end time)
- Display existing availability records
- Allow adding new availability slots
- Allow deleting availability slots
- Add to PlaceDetail page (for hosts)

**Files:**
- `src/pages/PlaceAvailability.jsx` (new) OR
- Add section to `src/pages/PlaceDetail.jsx` (modify)

---

### STEP 4: Create Facilitator Availability Management UI
**Goal:** Allow facilitators to set their availability

**Tasks:**
- Create facilitator availability management page
- Add calendar/date picker
- Add time range picker
- Display existing availability
- Allow adding/deleting availability
- Add link from profile/settings

**Files:**
- `src/pages/FacilitatorAvailability.jsx` (new) OR
- Add section to Profile page

---

### STEP 5: Create Member Availability UI
**Goal:** Allow members to mark availability for communities

**Tasks:**
- Add availability marking to CommunityDetail page
- Simple date picker (no time needed for members)
- Show member availability count
- Allow marking/unmarking availability

**Files:**
- `src/pages/CommunityDetail.jsx` (modify)

---

### STEP 6: Polish & Testing
**Goal:** Ensure everything works smoothly

**Tasks:**
- Test availability filtering in event creation
- Test availability management flows
- Add loading states
- Add error handling
- Add empty states
- Ensure responsive design

---

## Implementation Order

1. ✅ **STEP 1** - API Functions (Foundation)
2. ✅ **STEP 2** - Event Creation Integration (Core Feature)
3. ✅ **STEP 3** - Place Availability Management (Host Feature)
4. ✅ **STEP 4** - Facilitator Availability Management (Facilitator Feature)
5. ✅ **STEP 5** - Member Availability (Community Feature)
6. ✅ **STEP 6** - Polish & Testing

---

## Technical Considerations

### Date/Time Handling
- Use ISO date strings (YYYY-MM-DD)
- Use 24-hour time format (HH:MM:SS) for API
- Display in user-friendly format (12-hour with AM/PM)

### Availability Matching Logic
- Place availability: Check if date matches AND time range overlaps
- Facilitator availability: Check if date matches (time optional)
- Member availability: Check if date matches (no time)

### Error Handling
- Show user-friendly error messages
- Handle network failures gracefully
- Provide fallback behavior (show all places if availability check fails)

### Performance
- Debounce date/time changes when fetching availability
- Cache availability data when possible
- Load availability on-demand (not all at once)

---

## Success Criteria

✅ Users can set place availability  
✅ Users can set facilitator availability  
✅ Users can mark member availability  
✅ Event creation shows only available places  
✅ Event creation shows available facilitators  
✅ Event creation shows member availability counts  
✅ All UI is responsive and accessible  
✅ Error states are handled gracefully  

---

**Ready to begin implementation!**
