# Demo Mode Fix - Host Not Seeing Their Data

## Issue
When logging in as demo host, the user couldn't see their own communities, venues (places), and events.

## Root Cause
1. **`getPlacesInMyCommunities()`** - No demo handling, was calling API and failing
2. **`getMySchedule()`** - No demo handling, was calling API and failing  
3. **`isDemoMode()` checks** - Not defensive enough (could fail if localStorage undefined or token null)
4. **Response format** - Some functions returned `Promise.resolve()` unnecessarily

## Fixes Applied

### 1. Added Demo Handling to Missing APIs
- ✅ **`getPlacesInMyCommunities()`** - Returns demo places (`space-demo-1`, `space-demo-2`) when in demo mode
- ✅ **`getMySchedule()`** - Returns demo host's events as schedule items when in demo mode

### 2. Improved `isDemoMode()` Checks
Updated all API files to use defensive checks:
```javascript
function isDemoMode() {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;
  return isDemoToken(token);
}
```

### 3. Consistent Response Format
All demo API functions now return `Promise.resolve({ data })` to match API client response format:
- `getMyPlaces()` → `{ places: [...] }`
- `getMyEvents()` → `{ events: [...] }`
- `getMyCommunities()` → `{ communities: [...] }`
- `getPlacesInMyCommunities()` → `{ places: [...] }`
- `getMySchedule()` → `{ schedule: [...] }`

## Files Modified
- `src/api/places.js` - Added demo handling for `getPlacesInMyCommunities()`, improved `isDemoMode()`
- `src/api/events.js` - Improved `isDemoMode()`
- `src/api/schedule.js` - Added demo handling for `getMySchedule()`, improved `isDemoMode()`
- `src/api/communities.js` - Improved `isDemoMode()`
- `src/api/availability.js` - Improved `isDemoMode()`

## Expected Behavior After Fix
When logged in as **Demo Host** (`demo:host` token):
- ✅ **Dashboard** shows 2 places (Demo Host Studio, Demo Community Hall)
- ✅ **Dashboard** shows 2 events (Demo Welcome Workshop, Demo Community Meetup)
- ✅ **Dashboard** shows schedule with demo events
- ✅ **My Places** page shows 2 demo places
- ✅ **My Events** page shows 2 demo events
- ✅ **My Communities** shows Demo Community + 2 others (with owner role on Demo Community)
- ✅ **Places in my communities** shows demo places

## Testing
1. Log in as Demo Host
2. Navigate to Dashboard - should see places and events
3. Navigate to My Places - should see 2 places
4. Navigate to My Events - should see 2 events
5. Navigate to My Communities - should see Demo Community as owner
