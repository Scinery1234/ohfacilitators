# Demo Mode Verification Checklist

This doc summarizes demo coverage and how to verify that **demo user** and **demo host** can use all pages and features without errors.

## APIs with Demo Handling

| API | Demo behavior |
|-----|----------------|
| **Communities** | |
| `getExploreData()` | Returns mock communities, places, events (no backend call). |
| `getMyCommunities()` | Returns mock list with Demo Community; role by demo user/host. |
| `getCommunityDetail(slug)` | Returns mock for `demo-community` (comm-demo). |
| `getCommunityMembers(communityId)` | Returns DEMO_COMMUNITY_MEMBERS for `comm-demo`. |
| `getCommunityLinkRequests(communityId)` | Returns `{ requests: [] }` for `comm-demo`. |
| `getCommunityJoinRequests(communityId)` | Returns `{ requests: [] }` for `comm-demo`. |
| **Places** | |
| `getMyPlaces()` | Returns demo host places when demo. |
| `getPlacesInMyCommunities()` | Returns demo places for HostEvent / scope. |
| `getPlace(id)` | Returns mock for any id that has `getMockVenueDetail(id)` (e.g. space-demo-1, space-1). |
| **Events** | |
| `getMyEvents()` | Returns demo host events when demo. |
| `getEvent(id)` | Returns mock for any id that has `getMockEventDetail(id)` (e.g. event-demo-1, event-2). |
| **Schedule** | |
| `getMySchedule()` | Returns demo host events as schedule when demo. |
| **Bookings** | |
| `getMyBooking(scope)` | Returns mock user bookings (`scope === 'mine'`) or host bookings (`scope === 'host'`) when demo. |
| **Availability** | |
| Place / facilitator / member availability | All use mocks when demo; create/delete use in-memory mocks. |

## Router / Loaders

- **Venues** `venues/:id` and **Listings** `listings/event/:id`: loaders try mock first (`getMockVenueDetail` / `getMockEventDetail`) for any id, then API, so demo IDs don’t 404.

## Manual Verification

### As Demo User (Log in as User)

1. **Login** – Use “Log in as User” → token `demo:user`, user `demo-user-1`.
2. **Communities (Explore)** – Explore tab shows communities, places, events (from mocks); no failed requests.
3. **My Communities** – Shows Demo Community (and 2 others from mock); no invalid token.
4. **Community detail** – Open Demo Community (`/communities/demo-community`): places/events tabs load; no 404.
5. **Events tab** – Member availability: mark dates, see counts; no errors.
6. **Profile** – Loads; facilitator availability (if shown) uses mocks.
7. **My Bookings** – List loads with mock user bookings; detail enrichment (getPlace/getEvent) works for mock listingIds.
8. **Dashboard** – No host-only sections; no errors.
9. **Venue / Event detail** – Open a venue or event from explore (e.g. by id): load from mock or API; no 404.

### As Demo Host (Log in as Host)

1. **Login** – Use “Log in as Host” → token `demo:host`, user `demo-host-1`.
2. **Dashboard** – Shows 2 places, 2 events, schedule, bookings (from mocks).
3. **My Places** – Shows 2 demo places (e.g. Demo Host Studio, Demo Community Hall).
4. **My Events** – Shows 2 demo events.
5. **My Communities** – Shows Demo Community as owner.
6. **Community detail** – Open Demo Community: can manage; members, link requests, join requests load (mocks/empty).
7. **Place detail** – Open a demo place (`/venues/space-demo-1` or similar): place availability manager works (mock).
8. **Host Event** – Choose date/time: places/facilitators/member counts load (mocks); no failed availability calls.
9. **Profile** – Facilitator availability manager works (mock).
10. **My Bookings (host)** – Host dashboard bookings section shows mock host bookings; no errors.

### Quick Smoke Checks

- No red errors in console when navigating as demo user or demo host.
- No “Invalid token” or 401 on My Communities or other protected pages.
- No 404 on demo resources: `demo-community`, `space-demo-1`, `space-demo-2`, `event-demo-1`, `event-demo-2`.
- Availability UIs (place, facilitator, member) do not call real API in demo; counts and add/delete work with mocks.

## Recent Fixes (for this verification pass)

- **getExploreData()** – Demo mode now returns mock communities, places, events so Explore/Communities page doesn’t fail.
- **getMyBooking(scope)** – Demo mode returns mock user or host bookings with `listingType`/`listingId` so My Bookings and Host Dashboard work.
- **getCommunityLinkRequests / getCommunityJoinRequests** – For `comm-demo` in demo mode return `{ requests: [] }` so community admin section doesn’t error.
- **communities.js** – Fixed typo: `}export` → `}\n\nexport` for `rejectJoinRequest`.

After these changes, both demo user and demo host flows should work across all listed pages and features without errors.
