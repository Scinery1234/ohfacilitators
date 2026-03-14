# Issues Found and Suggested Fixes

## Critical Issues

### 1. **Dashboard.jsx - Undefined Variable**
**Issue**: `isHost` is used on line 42 but never defined.
**Location**: `src/pages/Dashboard.jsx:42`
**Fix**: Remove the badge or derive it from user data (though we removed host role requirement, so this badge may not be needed).

### 2. **Mock Data vs Real API Mismatch**
**Issue**: 
- `ListingDetail.jsx` uses `getMockEvent()` but should fetch from real API
- `VenueDetail.jsx` uses `getMockVenue()` but should fetch from real API
- Real events don't have `price`, `date`, `time`, `host.id`, `host.name`, `attendees` fields
- Booking code tries to use `event.date` and `event.host.id` which don't exist in real API data

**Impact**: 
- Created events won't display correctly when viewing detail pages
- Booking will fail because it references non-existent fields
- Navigation from "My Events" to event detail pages will show mock data instead of real data

**Fix**: 
- Create GET `/api/events/[id].ts` endpoint
- Update `ListingDetail.jsx` to fetch real event data
- Update booking code to use `startAt` instead of `date`, and `createdBy` instead of `host.id`
- Add price field to events table OR remove price display from UI

### 3. **Missing GET Event Endpoint**
**Issue**: No `GET /api/events/${id}` endpoint exists. Only POST and GET with query params.
**Location**: `api/events/index.ts` only handles `?mine=true` and POST
**Fix**: Create `api/events/[id].ts` to fetch single event by ID

### 4. **PlaceDetail Requires Auth for Public Places**
**Issue**: `api/places/[id].ts` requires authentication, but public places should be viewable without login.
**Location**: `api/places/[id].ts:11`
**Fix**: Allow public viewing for places with `visibility='public'`, require auth only for draft/unlisted or editing

### 5. **MyBookings is Empty Placeholder**
**Issue**: `MyBookings.jsx` just shows "Coming soon" but doesn't fetch actual bookings.
**Location**: `src/pages/MyBookings.jsx`
**Fix**: Implement booking fetching and display using `getMyBooking()` API

### 6. **Events Table Missing Price Field**
**Issue**: Database schema doesn't include `price` field for events, but UI displays prices.
**Location**: `server-lib/db.ts` events table definition
**Fix**: Either add `price` column to events table OR remove price display from event detail pages

### 7. **Data Structure Inconsistencies**
**Issue**: 
- Mock events: `communityIds` (plural array), `host: {id, name}`, `date`, `time`, `price`
- Real events: `communityId` (singular), `createdBy` (userId), `startAt`, `endAt`, no price
- Booking code expects mock structure

**Fix**: 
- Update booking code to work with real API structure
- Add helper functions to normalize data or update UI to match API structure

### 8. **Navigation Links to Mock Data Pages**
**Issue**: 
- `MyEvents.jsx` links to `/listings/event/${id}` which uses mock data
- `PlaceDetail.jsx` links events to `/listings/event/${id}` which uses mock data
- Created events won't be viewable via these links

**Fix**: Create real event detail page or update `ListingDetail.jsx` to handle real API data

## Medium Priority Issues

### 9. **Address Lookup Uses External API**
**Issue**: `ListPlace.jsx` uses OpenStreetMap Nominatim API which may have rate limits and requires attribution.
**Location**: `src/pages/ListPlace.jsx`
**Fix**: Consider using Google Places API (with API key) or making it optional/fallback

### 10. **No Error Handling for Failed Address Lookup**
**Issue**: Address autocomplete silently fails if API is unavailable.
**Fix**: Add error handling and user feedback

### 11. **Booking Success Doesn't Refresh Data**
**Issue**: After booking, the page shows success but doesn't update event capacity/attendees.
**Fix**: Refetch event data after successful booking or update optimistically

### 12. **No Price Field in Event Creation Forms**
**Issue**: `HostEvent.jsx` and `FacilitateEvent.jsx` don't have price input, but events display prices.
**Fix**: Add price field to event creation forms OR remove price display

## Suggested Implementation Order

1. **Fix Dashboard.jsx undefined variable** (quick fix)
2. **Add price field to events table** OR remove price display (decide on approach)
3. **Create GET `/api/events/[id].ts` endpoint**
4. **Update ListingDetail.jsx to use real API**
5. **Fix booking code to use correct field names**
6. **Make PlaceDetail viewable publicly for public places**
7. **Implement MyBookings page**
8. **Update navigation links to work with real data**
