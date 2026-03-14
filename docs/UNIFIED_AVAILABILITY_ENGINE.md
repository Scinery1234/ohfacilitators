# Unified Availability Engine

A unified system for managing availability across users (members, facilitators, hosts) and venues in the wellness community platform.

## Architecture

The engine uses a **single unified model** scoped by `ownerType` (USER or VENUE):

- **AvailabilityProfile**: One profile per owner (user or venue)
- **AvailabilitySlot**: Recurring (dayOfWeek) or date-specific availability windows
- **AvailabilityOverride**: Blocked or booked times that override slots

This eliminates separate systems per role and enables:
- Consistent API across all availability types
- Easy aggregation for community heatmaps
- Conflict detection for venue bookings
- Recurring + one-off availability patterns

## Database Schema

### Prisma Schema

See `backend/prisma/schema.prisma` for the full Prisma schema.

### SQLite Migration

Run the migration to convert existing availability tables:

```bash
cd backend
sqlite3 ohfacilitators.db < migrations/001_unified_availability.sql
```

Or manually run the SQL in `backend/migrations/001_unified_availability.sql`.

### Key Models

**AvailabilityProfile**
- `ownerType`: 'USER' | 'VENUE'
- `ownerId`: User ID or Venue ID
- `timezone`: Default 'Australia/Sydney'

**AvailabilitySlot**
- `date`: null if recurring, specific date if one-off
- `dayOfWeek`: 0-6 (0=Sunday) if recurring
- `period`: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'CUSTOM'
- `startTime` / `endTime`: HH:MM format
- `status`: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE'

**AvailabilityOverride**
- `date`: Specific date
- `startTime` / `endTime`: HH:MM format
- `status`: 'BLOCKED' | 'BOOKED'
- `notes`: Optional (e.g., booking reference)

## API Routes

All routes are under `/api/availability/`:

### Profile

- `GET /api/availability/profile?ownerType=USER&ownerId=123`
  - Get profile with slots and overrides
- `POST /api/availability/profile`
  - Create or update profile
  - Body: `{ ownerType, ownerId, timezone? }`

### Slots

- `POST /api/availability/slot`
  - Create slot (recurring or date-specific)
  - Body: `{ ownerType, ownerId, date?, dayOfWeek?, period, startTime, endTime, status? }`
- `DELETE /api/availability/slot/:id`
  - Delete slot

### Overrides

- `POST /api/availability/override`
  - Create override (blocked/booked time)
  - Body: `{ ownerType, ownerId, date, startTime, endTime, status, notes? }`
- `DELETE /api/availability/override/:id`
  - Delete override

### Venue Availability (Conflict-Aware)

- `GET /api/availability/venues/:id/availability?date=2025-03-15&startTime=10:00&endTime=14:00`
  - Get venue availability with conflict detection
- `POST /api/availability/venues/:id/check-availability`
  - Check if venue is available for specific time
  - Body: `{ date, startTime, endTime }`
  - Returns: `{ available, conflicts, matchingSlots }`

### Community Heatmap

- `GET /api/availability/communities/:id/availability-heatmap?includeVenues=true`
  - Aggregate USER availability for community members
  - Returns: `{ heatmap: [{ dayOfWeek, period, availableCount, totalMembers, percentage, availableUsers? }], totalMembers, venues? }`

## Frontend Components

### MyAvailability.tsx

**Location**: `src/components/availability/MyAvailability.jsx`

**Usage**: For members, facilitators, and hosts to manage their availability.

```jsx
import MyAvailability from '@/components/availability/MyAvailability';

<MyAvailability />
```

**Features**:
- Weekly grid (Mon-Sun × Morning/Afternoon/Evening)
- Toggle availability per cell
- Custom time range option
- Optimistic updates

### VenueAvailabilityCalendar.tsx

**Location**: `src/components/availability/VenueAvailabilityCalendar.jsx`

**Usage**: For venue managers.

```jsx
import VenueAvailabilityCalendar from '@/components/availability/VenueAvailabilityCalendar';

<VenueAvailabilityCalendar venueId="venue-123" />
```

**Features**:
- Month calendar view
- Color coding: Green = available, Red = booked, Grey = blocked
- Click day to add/remove slot
- Conflict detection prevents double booking

### CommunityAvailabilityHeatmap.tsx

**Location**: `src/components/availability/CommunityAvailabilityHeatmap.jsx`

**Usage**: For community managers.

```jsx
import CommunityAvailabilityHeatmap from '@/components/availability/CommunityAvailabilityHeatmap';

<CommunityAvailabilityHeatmap 
  communityId="comm-123" 
  onCreateEvent={(data) => {
    // Navigate to event creation with pre-filled data
    navigate('/host/event', { state: data });
  }}
/>
```

**Features**:
- Grid (Mon-Sun × Morning/Afternoon/Evening)
- Heatmap intensity based on % available
- Hover/click → show modal with available members
- "Create Event from This Time" button

## Frontend API Client

**Location**: `src/api/availability-unified.js`

All functions return Promises and handle demo mode automatically.

```javascript
import {
  getAvailabilityProfile,
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  getVenueAvailability,
  checkVenueAvailability,
  getCommunityAvailabilityHeatmap,
} from '@/api/availability-unified';

// Get user availability
const { profile, slots, overrides } = await getAvailabilityProfile('USER', userId);

// Create recurring slot (Monday mornings)
await createAvailabilitySlot({
  ownerType: 'USER',
  ownerId: userId,
  dayOfWeek: 1, // Monday
  period: 'MORNING',
  startTime: '09:00',
  endTime: '12:00',
});

// Check venue availability
const { available, conflicts } = await checkVenueAvailability(venueId, {
  date: '2025-03-15',
  startTime: '10:00',
  endTime: '14:00',
});

// Get community heatmap
const { heatmap, totalMembers } = await getCommunityAvailabilityHeatmap(communityId);
```

## Seeding Demo Data

Run the seed script to create demo data:

```bash
cd backend
node scripts/seed-unified-availability.js
```

This creates:
- 1 community (`comm-demo-availability`)
- 20 members
- 2 facilitators
- 1 host
- 2 venues
- Random recurring availability for users (30-70% coverage)
- Venue availability (weekdays for venue 1, weekends for venue 2)
- Random overrides (blocked/booked dates)

## Integration Examples

### Add MyAvailability to Profile Page

```jsx
// src/pages/Profile.jsx
import MyAvailability from '@/components/availability/MyAvailability';

// In Profile component:
<MyAvailability />
```

### Add VenueAvailabilityCalendar to Place Detail

```jsx
// src/pages/PlaceDetail.jsx
import VenueAvailabilityCalendar from '@/components/availability/VenueAvailabilityCalendar';

// In PlaceDetail component (if user is host):
{canManage && <VenueAvailabilityCalendar venueId={place.id} />}
```

### Add CommunityAvailabilityHeatmap to Community Detail

```jsx
// src/pages/CommunityDetail.jsx
import CommunityAvailabilityHeatmap from '@/components/availability/CommunityAvailabilityHeatmap';
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// In CommunityDetail component:
{canManage && (
  <CommunityAvailabilityHeatmap
    communityId={community.id}
    onCreateEvent={(data) => {
      navigate('/host/event', { state: data });
    }}
  />
)}
```

### Pre-fill Event Form from Heatmap

```jsx
// src/pages/HostEvent.jsx
import { useLocation } from 'react-router-dom';

const location = useLocation();
const prefilledData = location.state; // From heatmap

useEffect(() => {
  if (prefilledData) {
    setSelectedDate(prefilledData.date);
    setStartTime(prefilledData.startTime);
    setEndTime(prefilledData.endTime);
    // ... set other fields
  }
}, [prefilledData]);
```

## Performance Considerations

- **Batching**: Heatmap queries batch member lookups to avoid N+1
- **Indexes**: Database indexes on `(ownerType, ownerId)`, `(profileId, date)`, `(profileId, dayOfWeek)`
- **Caching**: Consider caching heatmap results (refresh on availability changes)

## Permissions

- **USER availability**: Users can only manage their own
- **VENUE availability**: Only venue hosts can manage
- **Community heatmap**: Read-only for members, editable for community managers

## Demo Mode

All API functions in `availability-unified.js` automatically detect demo mode (token starts with `demo:`) and return mock data without calling the backend.

## Next Steps

1. **Run migration**: Apply SQL migration to convert existing data
2. **Seed data**: Run seed script for demo data
3. **Integrate components**: Add components to Profile, PlaceDetail, CommunityDetail pages
4. **Test**: Verify availability management, conflict detection, and heatmap aggregation
5. **Extend**: Add notifications, recurring pattern editor, bulk operations

## File Structure

```
backend/
  prisma/
    schema.prisma                    # Prisma schema (reference)
  migrations/
    001_unified_availability.sql     # SQL migration
  routes/
    availability-unified.js          # Unified API routes
  scripts/
    seed-unified-availability.js     # Demo seed script

src/
  api/
    availability-unified.js          # Frontend API client
  components/
    availability/
      MyAvailability.jsx            # User availability component
      VenueAvailabilityCalendar.jsx # Venue calendar component
      CommunityAvailabilityHeatmap.jsx # Community heatmap component
```

## Notes

- The engine is **backward compatible** with existing availability tables (they can coexist)
- Old tables can be dropped after migration verification
- Demo mode is fully supported for offline testing
- All time handling uses HH:MM format (24-hour)
- Timezone support is built-in but defaults to 'Australia/Sydney'
