# Frontend UX Improvement Plan

**Date:** February 20, 2026  
**Based on:** UX & Aesthetic Audit  
**Goal:** Specific, actionable improvements to enhance usability, visual hierarchy, and emotional tone

---

## IMPROVEMENT PHILOSOPHY

1. **Clarity over Cleverness** - Make it obvious what users can do
2. **Progressive Disclosure** - Show what's needed, hide what's not
3. **Consistent Patterns** - Reusable components and spacing systems
4. **Human Language** - Replace technical terms with friendly copy
5. **Generous Whitespace** - Let content breathe
6. **Clear Hierarchy** - One primary action per screen

---

## 1. EVENT LIFECYCLE VISIBILITY (CRITICAL)

### 1.1 Create EventStatusBadge Component
**File:** `src/components/ui/EventStatusBadge.jsx` (new)

**Purpose:** Centralized, consistent status display for events

**Design:**
- **Proposed:** Amber badge with "Awaiting Approval" label
- **Approved:** Blue badge with "Approved" label  
- **Published:** Green badge with "Published" label
- **Cancelled:** Gray badge with "Cancelled" label

**Why:** Users need to understand event state at a glance. Consistent styling builds trust.

---

### 1.2 Add Status to Event Cards
**Files:** `src/pages/MyEvents.jsx`, `src/pages/HostDashboard.jsx`, `src/pages/ListingDetail.jsx`

**Changes:**
- Display `EventStatusBadge` prominently on all event cards
- Show status next to title or in card header
- Add tooltip/explanation: "This event needs venue approval before it can be published"

**Why:** Makes lifecycle visible, explains why events aren't bookable yet.

---

### 1.3 Add Approval/Publish Actions
**Files:** `src/pages/ListingDetail.jsx`, `src/pages/MyEvents.jsx`

**Changes:**
- Show "Approve Event" button for place hosts (only if status = "proposed")
- Show "Publish Event" button for event creator (only if status = "venue_approved")
- Add clear messaging: "This event is awaiting your approval" / "Ready to publish!"
- Position prominently in event detail view

**Why:** Completes the workflow, makes actions discoverable.

---

### 1.4 Add Status Explanations
**Files:** `src/pages/MyEvents.jsx`, `src/pages/ListingDetail.jsx`

**Changes:**
- Add helper text below status: "Proposed events need venue approval before they can accept bookings"
- Show next steps: "Waiting for venue approval" → "Ready to publish" → "Accepting bookings"

**Why:** Educates users about the process, reduces confusion.

---

## 2. VISUAL HIERARCHY IMPROVEMENTS

### 2.1 Standardize Heading Sizes
**Files:** All pages

**System:**
- **H1 (Page Title):** `text-4xl font-display font-semibold` (was `text-3xl`)
- **H2 (Section Title):** `text-2xl font-display font-semibold` (consistent)
- **H3 (Subsection):** `text-xl font-semibold` (was `text-lg`)
- **H4 (Card Title):** `text-lg font-semibold` (consistent)

**Why:** Creates clear information hierarchy, improves scannability.

---

### 2.2 Establish Primary Action Per Page
**Files:** `src/pages/HostDashboard.jsx`, `src/pages/MyEvents.jsx`, `src/pages/Dashboard.jsx`

**Changes:**
- **HostDashboard:** Primary = "Create Event" (larger, more prominent)
- **MyEvents:** Primary = "Host an Event" (prominent CTA at top)
- **Dashboard:** Primary = "List a Place" (most common action)

**Why:** Reduces decision paralysis, guides users to most important action.

---

### 2.3 Create Spacing System
**Files:** All pages

**System:**
- **Page Container:** `py-16 sm:py-20` (was `py-12 sm:py-16`)
- **Section Spacing:** `mb-12 sm:mb-16` (was `mb-10`)
- **Card Padding:** `p-6` (was `p-4` or `p-8`)
- **Card Gap:** `gap-6` (consistent)
- **Form Field Spacing:** `space-y-8` (was `space-y-6`)

**Why:** Creates visual rhythm, feels more spacious and polished.

---

### 2.4 Improve Visual Weight Balance
**Files:** All pages with buttons/actions

**Changes:**
- **Primary Actions:** Larger buttons (`px-6 py-3`), bold text, prominent color
- **Secondary Actions:** Medium buttons (`px-4 py-2`), regular weight
- **Tertiary Actions:** Smaller, subtle (`text-sm`, lighter color)
- **Status Badges:** Smaller, don't compete with actions

**Why:** Users can quickly identify what's important.

---

## 3. COGNITIVE LOAD REDUCTION

### 3.1 Simplify HostDashboard
**File:** `src/pages/HostDashboard.jsx`

**Changes:**
- Group stats into single card with tabs (Places/Events/Bookings)
- Reduce quick actions from 3 to 2 (most common: "Create Event", "List Place")
- Show only 3 recent items per section (was 5)
- Add "View all" link to dedicated pages
- Increase spacing between sections

**Why:** Reduces overwhelming feeling, focuses attention on key actions.

---

### 3.2 Hide Disabled Features
**Files:** `src/pages/MyPlaces.jsx`, `src/pages/PlaceDetail.jsx`

**Changes:**
- Remove "Invite collaborator" button if feature not available
- Don't show "Coming soon" tooltips
- Only show actions user can actually perform

**Why:** Reduces frustration, eliminates visual clutter.

---

### 3.3 Improve Form Layout
**Files:** `src/pages/HostEvent.jsx`, `src/pages/PlaceEdit.jsx`

**Changes:**
- Group related fields (Date/Time together, Place/Community together)
- Add section headers: "Event Details", "Date & Time", "Location", "Visibility"
- Increase spacing between sections (`space-y-8`)
- Make optional fields visually lighter (smaller label, hint text)
- Add progress indicator for multi-step forms

**Why:** Makes forms less intimidating, easier to complete.

---

### 3.4 Replace Technical Terms
**Files:** All pages

**Changes:**
- "visibility" → "Status" or "Visibility Status"
- "draft/unlisted/public" → "Draft / Unlisted / Published"
- "listingType" → Remove (internal only)
- "createdBy" → "Host" or "Created by"
- "venue_approved" → "Approved" or "Ready to Publish"

**Why:** Makes interface feel user-friendly, not technical.

---

## 4. FLOW CLARITY IMPROVEMENTS

### 4.1 Add Clear Page Purpose
**Files:** `src/pages/Dashboard.jsx`, `src/pages/MyEvents.jsx`

**Changes:**
- **Dashboard:** Add subtitle: "Quick access to your places, events, and schedule"
- **MyEvents:** Add subtitle: "Manage events you host, facilitate, or attend"
- **Communities:** Add explanation: "Browse communities, venues, events, and facilitators"

**Why:** Users immediately understand what the page is for.

---

### 4.2 Add Next Steps Guidance
**Files:** `src/pages/HostEvent.jsx`, `src/pages/MyEvents.jsx`

**Changes:**
- After event creation: Show success message with next steps
  - "Event created! It's now awaiting venue approval."
  - "Once approved, you can publish it to accept bookings."
- In MyEvents: Show status-based guidance
  - "This event needs approval" → Link to contact venue
  - "This event is approved" → "Publish it now" button

**Why:** Guides users through the workflow, reduces confusion.

---

### 4.3 Clarify User Roles
**Files:** `src/pages/ListingDetail.jsx`, `src/pages/CommunityDetail.jsx`

**Changes:**
- Show role badge: "You are the host" / "You are a facilitator" / "You are attending"
- Disable/gray out actions user can't perform
- Add tooltip: "Only place hosts can approve events"

**Why:** Prevents frustration from trying unavailable actions.

---

## 5. MICROCOPY IMPROVEMENTS

### 5.1 Improve Button Labels
**Files:** All pages

**Changes:**
- "View all" → "See all" or "Browse all"
- "Create Event" → "Host an Event" (more engaging)
- "List a Place" → Keep (already good)
- "Invite collaborator" → "Invite Collaborator" (capitalize)
- "Delete place" → "Delete Place" (capitalize)

**Why:** More engaging, clearer action verbs.

---

### 5.2 Improve Form Labels
**File:** `src/pages/HostEvent.jsx`

**Changes:**
- "Place (Optional)" → "Select a Venue (Optional)"
- "Start Date & Time" → "When does it start?"
- "End Date & Time (Optional)" → "When does it end? (Optional)"
- "Capacity (Optional)" → "How many people can attend? (Optional)"
- "Visibility" → "Who can see this event?"

**Why:** More conversational, less technical.

---

### 5.3 Improve Error Messages
**Files:** All pages with error handling

**Changes:**
- "Failed to load" → "We couldn't load your events. Please try again."
- "Failed to create event" → "We couldn't create your event. Check the details and try again."
- Add helpful context: "Make sure you're signed in" or "Check your internet connection"

**Why:** More helpful, less frustrating.

---

### 5.4 Improve Empty States
**Files:** All pages with empty states

**Changes:**
- "No events yet" → "You haven't created any events yet"
- "No bookings yet" → "You don't have any bookings yet"
- Add encouraging tone: "Create your first event to get started!"

**Why:** More encouraging, guides action.

---

## 6. LAYOUT CONSISTENCY

### 6.1 Standardize Button Variants
**Files:** `src/components/ui/Button.jsx` (if exists), all pages

**System:**
- **Primary:** `bg-stone-900 text-white` (main action)
- **Secondary:** `bg-white border-2 border-stone-300 text-stone-900` (secondary action)
- **Danger:** `bg-red-50 border-2 border-red-200 text-red-700` (destructive)
- **Outline:** `bg-transparent border border-stone-300 text-stone-700` (tertiary)

**Sizes:**
- **Large:** `px-6 py-3 text-base` (primary actions)
- **Medium:** `px-4 py-2 text-sm` (secondary actions)
- **Small:** `px-3 py-1.5 text-xs` (tertiary actions)

**Why:** Clear visual hierarchy, consistent experience.

---

### 6.2 Create Shared StatusBadge Component
**File:** `src/components/ui/StatusBadge.jsx` (new)

**Purpose:** Unified status badge styling

**Design:**
- Consistent padding: `px-3 py-1`
- Consistent text: `text-xs font-medium`
- Consistent radius: `rounded-full`
- Color system: Green (success), Amber (pending), Blue (info), Gray (neutral), Red (error)

**Why:** Professional, consistent appearance.

---

### 6.3 Standardize Card Layout
**Files:** All pages with cards

**System:**
- **Padding:** `p-6` (consistent)
- **Border:** `border border-stone-200`
- **Radius:** `rounded-2xl`
- **Shadow:** `shadow-sm hover:shadow-md` (subtle)
- **Spacing:** `mb-6` between cards, `gap-6` in grids

**Why:** Polished, consistent feel.

---

### 6.4 Standardize Page Containers
**Files:** All pages

**System:**
- **Max Width:** `max-w-7xl mx-auto`
- **Padding:** `px-4 sm:px-6 lg:px-8`
- **Vertical Spacing:** `py-16 sm:py-20`
- **Section Spacing:** `mb-12 sm:mb-16`

**Why:** Consistent layout, better responsive behavior.

---

## 7. EMOTIONAL TONE IMPROVEMENTS

### 7.1 Increase Whitespace
**Files:** All pages

**Changes:**
- Increase page padding: `py-16 sm:py-20` (was `py-12 sm:py-16`)
- Increase section spacing: `mb-12 sm:mb-16` (was `mb-10`)
- Increase card padding: `p-6` (was `p-4`)
- Increase form field spacing: `space-y-8` (was `space-y-6`)

**Why:** Feels more spacious, less cramped, more premium.

---

### 7.2 Add Subtle Animations
**Files:** All interactive elements

**Changes:**
- Card hover: `transition-all duration-200`
- Button hover: `transition-colors duration-150`
- Image hover: `transition-transform duration-300`
- Smooth state changes: `transition-opacity duration-200`

**Why:** Feels polished, responsive, alive.

---

### 7.3 Improve Success States
**Files:** `src/pages/HostEvent.jsx`, `src/pages/PlaceEdit.jsx`

**Changes:**
- After successful creation: Show success message with icon
  - "Event created! 🎉"
  - "Your event is now awaiting approval."
- Add celebration moment, not just redirect

**Why:** Creates positive emotional connection.

---

### 7.4 Add Friendly Microcopy
**Files:** All pages

**Changes:**
- Replace formal language with conversational
- Add encouraging phrases: "You're doing great!", "Almost there!"
- Use friendly error messages: "Oops! Something went wrong."

**Why:** Feels more human, less sterile.

---

## 8. SPECIFIC PAGE IMPROVEMENTS

### 8.1 HostDashboard
**File:** `src/pages/HostDashboard.jsx`

**Improvements:**
1. Reduce stats to 3 most important (Places, Events, Upcoming Bookings)
2. Group quick actions into 2 primary buttons
3. Show only 3 recent items per section
4. Add "View all" links to dedicated pages
5. Increase spacing between sections
6. Add event status badges
7. Add primary CTA: "Create Event" prominently

**Why:** Less overwhelming, clearer focus, better flow.

---

### 8.2 MyEvents
**File:** `src/pages/MyEvents.jsx`

**Improvements:**
1. Add prominent "Host an Event" button at top
2. Show event status badges prominently
3. Add status-based actions (Approve/Publish buttons)
4. Improve card layout with better spacing
5. Add helpful status explanations
6. Group events by status (Proposed, Approved, Published)

**Why:** Makes lifecycle visible, guides next steps.

---

### 8.3 ListingDetail (Event)
**File:** `src/pages/ListingDetail.jsx`

**Improvements:**
1. Add event status badge prominently near title
2. Show approval/publish buttons based on user role and status
3. Add status explanation: "This event needs approval before bookings"
4. Improve booking section with clearer CTA
5. Add role indicator: "You are the host" / "You are attending"
6. Increase whitespace around content

**Why:** Makes workflow clear, guides actions.

---

### 8.4 HostEvent Form
**File:** `src/pages/HostEvent.jsx`

**Improvements:**
1. Group fields into sections with headers
2. Increase spacing between sections
3. Improve labels (more conversational)
4. Add helpful hints for each field
5. Show success state with next steps after creation
6. Make optional fields visually lighter

**Why:** Less intimidating, easier to complete.

---

### 8.5 Communities/Explore
**File:** `src/pages/Communities.jsx`

**Improvements:**
1. Simplify tab navigation (reduce visual weight)
2. Improve search bar styling
3. Add clearer section headers
4. Increase card spacing
5. Improve empty states
6. Add loading states

**Why:** Less cluttered, clearer navigation.

---

## IMPLEMENTATION PRIORITY

### Phase 1: Critical (Blocks Functionality)
1. ✅ EventStatusBadge component
2. ✅ Add status to event displays
3. ✅ Add approval/publish buttons
4. ✅ Add status explanations

### Phase 2: High Impact (Significant UX Improvement)
5. ✅ Standardize heading sizes
6. ✅ Establish primary actions
7. ✅ Create spacing system
8. ✅ Simplify HostDashboard
9. ✅ Replace technical terms

### Phase 3: Consistency (Polish)
10. ✅ Standardize button variants
11. ✅ Create StatusBadge component
12. ✅ Standardize card layouts
13. ✅ Improve microcopy

### Phase 4: Emotional Tone (Refinement)
14. ✅ Increase whitespace
15. ✅ Add subtle animations
16. ✅ Improve success states
17. ✅ Add friendly microcopy

---

## EXPECTED OUTCOMES

After implementing these improvements:

1. **Users understand event lifecycle** - Status is visible and explained
2. **Workflow is complete** - Approval/publish actions are discoverable
3. **Visual hierarchy is clear** - Users know what's important
4. **Cognitive load reduced** - Less overwhelming, clearer focus
5. **Consistent experience** - Professional, polished feel
6. **More engaging** - Friendly, human tone

---

**Ready for Implementation:** This plan provides specific, actionable improvements. Each change is designed to reduce friction and improve user experience.

**Next Step:** Confirm this plan, then proceed with STEP 3 (Implementation).
