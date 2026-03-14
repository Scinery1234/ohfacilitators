# Availability Functionality Testing Guide

This document describes how to test the unified availability engine with demo data.

## ✅ What's Been Implemented

### Backend
- ✅ Unified availability API routes (`/api/availability/*`)
- ✅ Database schema (auto-created in `db.js`)
- ✅ Seed script for demo data

### Frontend
- ✅ Mock data for demo mode (`src/mocks/availability-unified.js`)
- ✅ API client with demo mode support (`src/api/availability-unified.js`)
- ✅ MyAvailability component (user availability)
- ✅ VenueAvailabilityCalendar component (venue calendar)
- ✅ CommunityAvailabilityHeatmap component (community heatmap)

### Integration
- ✅ MyAvailability added to Profile page
- ✅ VenueAvailabilityCalendar added to PlaceDetail page
- ✅ CommunityAvailabilityHeatmap added to CommunityDetail page

## 🧪 Testing Steps

### 1. Test User Availability (MyAvailability)

1. **Login as Demo User**
   - Go to `/login`
   - Click "Log in as User"
   - User ID: `demo-user-1`

2. **Go to Profile**
   - Navigate to `/profile`
   - Scroll to "My Availability" section

3. **Test Features**
   - ✅ See weekly grid (Mon-Sun × Morning/Afternoon/Evening)
   - ✅ Click cells to toggle availability (should show green when active)
   - ✅ Verify existing slots are pre-populated (Mon-Fri mornings, Mon/Wed/Fri evenings)
   - ✅ Add custom time range
   - ✅ Toggle slots on/off - changes should persist

**Expected Behavior:**
- Demo user has pre-seeded availability: Mon-Fri mornings (9am-12pm), Mon/Wed/Fri evenings (6pm-9pm)
- Clicking a cell toggles it green/white
- Changes persist when navigating away and back

### 2. Test Venue Availability (VenueAvailabilityCalendar)

1. **Login as Demo Host**
   - Go to `/login`
   - Click "Log in as Host"
   - User ID: `demo-host-1`

2. **Go to Place Detail**
   - Navigate to `/venues/space-demo-1` or `/venues/space-demo-2`
   - Scroll to "Venue Availability" section

3. **Test Features**
   - ✅ See month calendar view
   - ✅ Green cells = available, Red = booked, Grey = blocked
   - ✅ Click a day to add availability slot
   - ✅ Click "Block Date" to block a day
   - ✅ Verify pre-seeded data:
     - Venue 1 (`space-demo-1`): Weekdays 9am-6pm
     - Venue 2 (`space-demo-2`): Weekends 10am-8pm
   - ✅ See booked dates (red) and blocked dates (grey)

**Expected Behavior:**
- Venue 1 shows weekday availability slots
- Venue 2 shows weekend availability slots
- Some dates show as booked (red) or blocked (grey)
- Clicking a day opens modal to add slot or block date

### 3. Test Community Heatmap (CommunityAvailabilityHeatmap)

1. **Login as Demo Host** (or Demo User with community access)
   - Go to `/login`
   - Click "Log in as Host" or "Log in as User"

2. **Go to Community Detail**
   - Navigate to `/communities/demo-community`
   - Scroll to "Community Availability" section (if you can manage)

3. **Test Features**
   - ✅ See heatmap grid (Mon-Sun × Morning/Afternoon/Evening)
   - ✅ Darker green = more members available
   - ✅ Click a cell to see details modal
   - ✅ Modal shows:
     - Available member count
     - Percentage
     - List of available members (if `includeVenues=true`)
   - ✅ Click "Create Event from This Time" button
   - ✅ Verify heatmap shows realistic data:
     - Different intensities across days/periods
     - Total members: 5 (demo community members)
     - Percentages vary by day/period

**Expected Behavior:**
- Heatmap shows varied intensities (not all random)
- Clicking a cell shows modal with member details
- "Create Event" button navigates to event creation with pre-filled date/time
- Available members list shows demo users (demo-user-1 through demo-user-5)

### 4. Test Demo Data Consistency

1. **Verify Demo Users Have Availability**
   - Login as demo-user-1 → Profile → Should see availability slots
   - Login as demo-host-1 → Profile → Should see availability slots

2. **Verify Demo Venues Have Availability**
   - Login as demo-host-1 → Place Detail (`space-demo-1`) → Should see calendar with slots
   - Login as demo-host-1 → Place Detail (`space-demo-2`) → Should see calendar with slots

3. **Verify Demo Community Heatmap**
   - Login as demo-host-1 → Community Detail (`demo-community`) → Should see heatmap
   - Heatmap should aggregate availability from 5 demo community members
   - Percentages should be realistic (not all 0% or 100%)

### 5. Test Create/Delete Operations

1. **Create Slot**
   - Profile → MyAvailability → Click empty cell
   - Should turn green and persist

2. **Delete Slot**
   - Profile → MyAvailability → Click green cell
   - Should turn white and persist

3. **Create Override (Venue)**
   - PlaceDetail → VenueAvailabilityCalendar → Click day → "Block Date"
   - Should show grey on calendar

4. **Delete Override**
   - PlaceDetail → VenueAvailabilityCalendar → Click blocked day → Remove
   - Should remove grey status

## 🐛 Known Issues / Edge Cases

- **Day of Week Conversion**: MyAvailability uses 1-6 (Mon-Sat), but API uses 0-6 (Sun-Sat). Conversion handled in component.
- **Demo Mode Persistence**: Changes persist in memory during session, but reset on page refresh (by design for demo).
- **Heatmap Data**: Uses pre-seeded patterns, not real-time aggregation in demo mode.

## 📊 Demo Data Summary

### Users with Availability
- `demo-user-1`: Mon-Fri mornings, Mon/Wed/Fri evenings
- `demo-host-1`: Mon-Fri 9am-5pm
- `demo-user-2` through `demo-user-5`: Various patterns (see `availability-unified.js`)

### Venues with Availability
- `space-demo-1`: Mon-Fri 9am-6pm + some booked dates
- `space-demo-2`: Weekends 10am-8pm + some blocked dates

### Community
- `comm-demo` (`demo-community`): 5 members with varied availability patterns

## ✅ Test Checklist

- [ ] User can view their availability on Profile page
- [ ] User can toggle availability slots
- [ ] User can add custom time ranges
- [ ] Host can view venue calendar
- [ ] Host can add availability slots to venue
- [ ] Host can block dates on venue calendar
- [ ] Community manager can view heatmap
- [ ] Heatmap shows realistic percentages
- [ ] Heatmap modal shows available members
- [ ] "Create Event" button works from heatmap
- [ ] All components work in demo mode (no backend)
- [ ] Changes persist during session
- [ ] No console errors
- [ ] Mobile responsive

## 🚀 Running Tests

1. **Start Frontend** (demo mode - no backend needed):
   ```bash
   npm run dev
   ```

2. **Test Flow**:
   - Login as demo user → Test MyAvailability
   - Login as demo host → Test VenueAvailabilityCalendar
   - Login as demo host → Test CommunityAvailabilityHeatmap

3. **Check Console**:
   - No errors should appear
   - API calls should be mocked (not hitting real backend)

## 📝 Notes

- All components work in **demo mode** without backend
- Mock data is initialized in `src/mocks/availability-unified.js`
- Changes persist in memory during session
- To test with backend, run seed script: `cd backend && node scripts/seed-unified-availability.js`
