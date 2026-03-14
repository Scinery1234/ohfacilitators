# Unified Availability Engine - Quick Start

## 🚀 Setup (5 minutes)

### 1. Database Tables

Tables are created automatically when you start the backend (via `db.js`). If you need to run the migration manually:

```bash
cd backend
sqlite3 ohfacilitators.db < migrations/001_unified_availability.sql
```

### 2. Seed Demo Data

```bash
cd backend
node scripts/seed-unified-availability.js
```

This creates:
- 1 community (`comm-demo-availability`)
- 20 members, 2 facilitators, 1 host
- 2 venues
- Random availability data

### 3. Start Backend

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:5000`

### 4. Start Frontend

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

## 📦 What's Included

### Backend
- ✅ Unified availability API routes (`/api/availability/*`)
- ✅ Database schema (auto-created in `db.js`)
- ✅ Seed script for demo data

### Frontend
- ✅ API client (`src/api/availability-unified.js`)
- ✅ MyAvailability component (user availability)
- ✅ VenueAvailabilityCalendar component (venue calendar)
- ✅ CommunityAvailabilityHeatmap component (community heatmap)

## 🎯 Quick Integration

### Add MyAvailability to Profile Page

```jsx
// src/pages/Profile.jsx
import MyAvailability from '@/components/availability/MyAvailability';

// Add inside Profile component:
<MyAvailability />
```

### Add VenueAvailabilityCalendar to Place Detail

```jsx
// src/pages/PlaceDetail.jsx
import VenueAvailabilityCalendar from '@/components/availability/VenueAvailabilityCalendar';

// Add if user is venue host:
{canManage && <VenueAvailabilityCalendar venueId={place.id} />}
```

### Add CommunityAvailabilityHeatmap to Community Detail

```jsx
// src/pages/CommunityDetail.jsx
import CommunityAvailabilityHeatmap from '@/components/availability/CommunityAvailabilityHeatmap';
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Add if user can manage community:
{canManage && (
  <CommunityAvailabilityHeatmap
    communityId={community.id}
    onCreateEvent={(data) => {
      navigate('/host/event', { state: data });
    }}
  />
)}
```

## 🧪 Testing

1. **User Availability**: Go to Profile page → Set availability
2. **Venue Availability**: Go to Place Detail (as host) → Manage calendar
3. **Community Heatmap**: Go to Community Detail (as manager) → View heatmap → Click cell → Create event

## 📚 Full Documentation

See `docs/UNIFIED_AVAILABILITY_ENGINE.md` for:
- Complete API reference
- Component props and usage
- Performance considerations
- Permission model

## 🎨 Demo Mode

All components work in demo mode (no backend required). Just log in as demo user/host and use the components.

## ⚠️ Notes

- Old availability tables (`place_availability`, `facilitator_availability`, `member_availability`) still exist for backward compatibility
- New unified tables are `availability_profiles`, `availability_slots`, `availability_overrides`
- Migration script can convert old data to new format (see `migrations/001_unified_availability.sql`)

## 🐛 Troubleshooting

**Tables not created?**
- Check `backend/db.js` - tables should auto-create on server start
- Verify SQLite database exists at `backend/ohfacilitators.db`

**API routes not working?**
- Check `backend/server.js` - should include `availabilityUnifiedRoutes`
- Verify route path: `/api/availability/*`

**Components not rendering?**
- Check browser console for errors
- Verify imports are correct
- Ensure user is authenticated

## 📝 Next Steps

1. ✅ Run seed script
2. ✅ Add components to pages
3. ✅ Test user/venue/community flows
4. ✅ Customize styling if needed
5. ✅ Add event creation pre-fill from heatmap
