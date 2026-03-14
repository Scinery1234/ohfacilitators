# Availability-Aware Calendar System

Three intelligent calendar views that display availability signals directly on the calendar surface without requiring clicks.

## 🎯 Overview

### EventHostCalendar
**Purpose**: Shows community availability density for event scheduling  
**Primary Signal**: Community availability percentage  
**Use Case**: Host deciding when to schedule events

### VenueBookingCalendar
**Purpose**: Shows venue availability + community demand  
**Primary Signal**: Venue availability status  
**Secondary Signal**: Community availability overlay  
**Use Case**: Host booking a venue

### FacilitatorBookingCalendar
**Purpose**: Shows facilitator availability + alignment signals  
**Primary Signal**: Facilitator availability status  
**Secondary Signals**: Community, venue, host availability  
**Use Case**: Host selecting a facilitator

## 📊 Backend API

### Endpoint
```
GET /api/scheduling/intelligence?month=3&year=2025&communityId=xxx&venueId=xxx&facilitatorId=xxx&hostId=xxx
```

### Response Format
```json
{
  "2025-03-01": {
    "venueAvailable": true,
    "venueStatus": "AVAILABLE",
    "facilitatorAvailable": true,
    "facilitatorStatus": "AVAILABLE",
    "hostAvailable": true,
    "communityAvailableCount": 17,
    "communityTotal": 25,
    "communityAvailabilityPercentage": 68,
    "availableFacilitators": [
      { "id": "...", "name": "...", "avatarUrl": "..." }
    ]
  }
}
```

## 🎨 Visual Design

### Color Coding

**EventHostCalendar** (Community Availability):
- 0-30%: Red gradient (`from-red-200 to-red-400`)
- 30-60%: Amber gradient (`from-amber-200 to-amber-400`)
- 60-80%: Light green (`from-green-200 to-green-300`)
- 80%+: Strong green (`from-green-300 to-green-500`)

**VenueBookingCalendar** (Venue Status):
- Available: Green (`bg-green-100 border-green-300`)
- Booked: Red (`bg-red-100 border-red-300`)
- Blocked: Grey (`bg-stone-200 border-stone-400`)

**FacilitatorBookingCalendar** (Facilitator Status):
- Available: Green (`bg-green-100 border-green-300`)
- Tentative: Amber (`bg-amber-100 border-amber-300`) + diagonal stripe
- Unavailable: Grey (`bg-stone-200 border-stone-400`)

### Cell Contents

**EventHostCalendar**:
- Date number (top-left)
- Large percentage (center, e.g. "68%")
- Member count (below percentage, e.g. "17 of 25")
- Facilitator avatars (bottom, max 3 + overflow)
- Venue indicator dot (bottom-right, green if available)
- Host unavailable badge (top-right, red dot)

**VenueBookingCalendar**:
- Date number (top-left)
- Venue status label (center, "Available"/"Booked"/"Blocked")
- Community overlay (if available, shows percentage)
- Facilitator avatars (bottom-left)
- Host unavailable badge (top-right)

**FacilitatorBookingCalendar**:
- Date number (top-left)
- Facilitator status (center)
- Community percentage badge (top-right, if enabled)
- Venue indicator dot (bottom-right, if enabled)
- Host conflict badge (bottom-left, if enabled)

## 🚀 Usage

### EventHostCalendar

```jsx
import EventHostCalendar from '@/components/availability/EventHostCalendar';

<EventHostCalendar
  communityId="comm-demo"
  hostId="demo-host-1"
  onCreateEvent={(data) => {
    navigate('/host/event', { state: data });
  }}
/>
```

### VenueBookingCalendar

```jsx
import VenueBookingCalendar from '@/components/availability/VenueBookingCalendar';

<VenueBookingCalendar
  venueId="space-demo-1"
  communityId="comm-demo"
  hostId="demo-host-1"
  onSelectDate={(date, data) => {
    // Handle date selection
    setSelectedDate(date);
  }}
/>
```

### FacilitatorBookingCalendar

```jsx
import FacilitatorBookingCalendar from '@/components/availability/FacilitatorBookingCalendar';

<FacilitatorBookingCalendar
  facilitatorId="demo-user-1"
  communityId="comm-demo"
  venueId="space-demo-1"
  hostId="demo-host-1"
  onSelectDate={(date, data) => {
    // Handle date selection
    setSelectedDate(date);
  }}
/>
```

## 🧪 Demo Mode

All calendars work in demo mode with mock data:
- `src/mocks/scheduling-intelligence.js` provides realistic variation
- Visual diversity: red/amber/green days across the month
- Facilitator avatars appear on available days
- Venue and host indicators show conflicts

## 📱 Responsive Design

- Desktop: Large cells (min 120px height)
- Mobile: Smaller cells, stacked layout
- Touch-friendly: Large tap targets
- Smooth animations: Hover effects, scale transforms

## 🎯 Integration Points

### HostEvent Page
Add calendar views for:
1. Community selection → EventHostCalendar
2. Venue selection → VenueBookingCalendar
3. Facilitator selection → FacilitatorBookingCalendar

### CommunityDetail Page
Add EventHostCalendar to show when community is most available.

### PlaceDetail Page
Add VenueBookingCalendar to show venue availability + demand.

## 🔧 Performance

- **Batch Aggregation**: Backend computes entire month in one query
- **No N+1**: Single endpoint returns all needed data
- **Caching**: Consider 5-10 minute cache for intelligence endpoint
- **Optimistic Updates**: UI updates immediately, syncs in background

## 📝 Demo Seed Requirements

Seed data should create visual variation:
- Some days red (low availability)
- Some days amber (medium availability)
- Some days green (high availability)
- Facilitator avatars appear on various days
- Venue conflicts visible
- Host conflicts visible

This creates a compelling demo showing scheduling intelligence.
