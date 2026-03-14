# Scheduling & Availability Features - Current Status

## Summary

**Backend:** ✅ Fully implemented  
**Frontend:** ❌ Not implemented (missing UI and integration)

---

## What Exists (Backend)

### Database Tables
- ✅ `place_availability` - Venues can mark available dates/times
- ✅ `facilitator_availability` - Facilitators can mark availability
- ✅ `member_availability` - Community members can mark availability

### API Endpoints (`/availability/*`)
- ✅ `GET /availability/places` - List place availability (filter by placeId, date)
- ✅ `POST /availability/places` - Create place availability (requires place host permission)
- ✅ `DELETE /availability/places/:id` - Delete place availability
- ✅ `GET /availability/facilitators` - List facilitator availability (filter by userId, date)
- ✅ `POST /availability/facilitators` - Create facilitator availability
- ✅ `DELETE /availability/facilitators/:id` - Delete facilitator availability
- ✅ `GET /availability/members` - List member availability (filter by userId, communityId, date)
- ✅ `POST /availability/members` - Create member availability
- ✅ `DELETE /availability/members/:id` - Delete member availability

### Schedule Viewing
- ✅ `GET /user/profile?schedule=true` - Returns user's schedule (events they host/facilitate/attend)
- ✅ `MySchedule` page displays schedule items

---

## What's Missing (Frontend)

### 1. Availability Management UI
**Status:** ❌ Not implemented

**Needed:**
- Page/component for place hosts to set venue availability
- Page/component for facilitators to set their availability
- Page/component for members to mark community availability
- Calendar/date picker interface for selecting available times
- Ability to view/edit/delete availability records

**Where it should be:**
- Place detail page → "Manage Availability" section (for hosts)
- Profile/Settings → "My Availability" (for facilitators)
- Community detail page → "Mark Availability" (for members)

### 2. Availability Integration in Event Creation
**Status:** ❌ Not implemented

**According to MVP spec:**
1. User selects date/time
2. System should show:
   - Available places for that date/time
   - Available facilitators for that date
   - Count of available community members
3. User selects from available options

**Current state:**
- Event creation form doesn't check availability
- Shows all places regardless of availability
- No facilitator availability display
- No member count display

**Needed changes:**
- Fetch availability when date/time is selected
- Filter places by availability
- Show available facilitators
- Display member availability count

### 3. Frontend API Functions
**Status:** ❌ Not implemented

**Missing files:**
- `src/api/availability.js` - API functions for availability endpoints

**Needed functions:**
```javascript
// Place availability
getPlaceAvailability(placeId, date)
createPlaceAvailability(data)
deletePlaceAvailability(id)

// Facilitator availability
getFacilitatorAvailability(userId, date)
createFacilitatorAvailability(data)
deleteFacilitatorAvailability(id)

// Member availability
getMemberAvailability(userId, communityId, date)
createMemberAvailability(data)
deleteMemberAvailability(id)
```

---

## Current User Experience

### What Users Can Do:
- ✅ View their schedule (events they host/facilitate/attend)
- ✅ Create events without checking availability
- ✅ See all places when creating events (not filtered by availability)

### What Users Cannot Do:
- ❌ Set venue availability
- ❌ Set facilitator availability
- ❌ Mark member availability
- ❌ See which places are available when creating events
- ❌ See which facilitators are available
- ❌ See member availability counts

---

## MVP Requirements (from MVP_PRODUCT_BEHAVIOR.md)

### Event Creation Flow Should:
1. ✅ User selects date and time
2. ❌ System returns available places (NOT IMPLEMENTED)
3. ❌ System returns available facilitators (NOT IMPLEMENTED)
4. ❌ System returns member availability count (NOT IMPLEMENTED)
5. ✅ User selects place/facilitator
6. ✅ System creates event as "proposed"

### Availability Behavior:
- ✅ Availability is advisory only (doesn't auto-create events)
- ✅ Availability doesn't auto-remove when event is created
- ❌ Availability is used for filtering during event creation (NOT IMPLEMENTED)

---

## Implementation Priority

### High Priority (Core MVP Feature)
1. **Create availability API functions** (`src/api/availability.js`)
2. **Integrate availability into event creation flow**
   - Fetch availability when date/time selected
   - Filter places by availability
   - Show available facilitators
   - Display member counts

### Medium Priority (User Management)
3. **Create availability management UI**
   - Place availability management (for hosts)
   - Facilitator availability management
   - Member availability marking

### Low Priority (Polish)
4. **Calendar view for availability**
5. **Bulk availability setting**
6. **Recurring availability patterns**

---

## Next Steps

To complete the availability features:

1. **Create API functions** (`src/api/availability.js`)
2. **Update HostEvent page** to:
   - Fetch availability when date/time changes
   - Filter places by availability
   - Show available facilitators
   - Display member availability counts
3. **Create availability management pages/components**
4. **Add availability display to place/facilitator profiles**

---

**Current Status:** Backend ready, frontend integration needed.
