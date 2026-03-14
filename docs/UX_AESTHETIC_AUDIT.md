# Frontend UX & Aesthetic Audit

**Date:** February 20, 2026  
**Scope:** Complete frontend UI/UX analysis  
**Goal:** Identify opportunities to improve usability, visual hierarchy, emotional tone, flow clarity, and aesthetic cohesion

---

## 1. VISUAL HIERARCHY

### ✅ Strengths
- Consistent use of `font-display` for headings creates clear distinction
- Hero section on Home page has strong visual weight
- Card-based layouts provide clear content boundaries
- Primary buttons use `bg-stone-900` or `bg-white` for strong contrast

### ❌ Issues

#### **1.1 Heading Hierarchy Inconsistency**
- **Problem:** Heading sizes vary inconsistently across pages
  - Home: `text-3xl`, `text-2xl`, `text-xl` (good progression)
  - HostDashboard: `text-3xl` for main heading, but `text-lg` for section headings (too small)
  - MyEvents: `text-3xl` main, but cards use `text-lg` (weak hierarchy)
  - Communities: Mix of `text-2xl`, `text-xl`, `text-lg` without clear pattern
- **Impact:** Users struggle to scan pages and understand content relationships
- **Location:** All pages

#### **1.2 Primary Action Ambiguity**
- **Problem:** Multiple competing actions on many pages
  - HostDashboard: 3 quick action cards + stats + 3 content sections (overwhelming)
  - MyEvents: No clear primary action (should be "Create Event" but it's buried)
  - Communities: Search bar + 6 tabs + action buttons (too many entry points)
- **Impact:** Users hesitate, don't know where to start
- **Location:** HostDashboard, MyEvents, Communities, Dashboard

#### **1.3 Spacing Inconsistency**
- **Problem:** Padding/margin values vary without system
  - Some sections: `py-12 sm:py-16`
  - Others: `py-10 sm:py-14`
  - Cards: Mix of `p-4`, `p-6`, `p-8`
  - Gaps: `gap-4`, `gap-6`, `gap-8` used inconsistently
- **Impact:** Feels unpolished, lacks rhythm
- **Location:** All pages

#### **1.4 Visual Weight Imbalance**
- **Problem:** Status badges, buttons, and links compete for attention
  - Status badges use bright colors (amber, green) but are small
  - "View →" links are prominent but secondary actions
  - Delete buttons are red but same size as primary actions
- **Impact:** Users can't quickly identify what's important
- **Location:** HostDashboard, MyEvents, MyBookings, ListingDetail

---

## 2. COGNITIVE LOAD

### ✅ Strengths
- Empty states provide clear guidance
- Loading states use skeleton screens
- Forms use clear labels and validation

### ❌ Issues

#### **2.1 Too Many Visible Decisions**
- **Problem:** HostDashboard shows 5 stats + 3 quick actions + 3 content sections simultaneously
- **Impact:** Overwhelming, especially for new hosts
- **Location:** HostDashboard

#### **2.2 Unnecessary Buttons**
- **Problem:** 
  - "Invite collaborator" buttons are disabled everywhere (should be hidden if not available)
  - Multiple "View all" links on same page (HostDashboard has 3)
  - "Coming soon" features shown but disabled
- **Impact:** Frustration, visual clutter
- **Location:** MyPlaces, PlaceDetail, HostDashboard

#### **2.3 Technical Labels**
- **Problem:** System terminology exposed to users
  - "visibility: draft/unlisted/public" (should be "Status: Draft/Unlisted/Published")
  - "proposed/venue_approved/published" (if shown, should be human-friendly)
  - "listingType: event/space" (internal concept)
- **Impact:** Confusion, feels like admin tool
- **Location:** MyPlaces, MyEvents, HostDashboard

#### **2.4 Overwhelming Forms**
- **Problem:** HostEvent form has 10+ fields in single view
  - No progressive disclosure
  - No field grouping
  - All optional fields shown equally
- **Impact:** Intimidating, high abandonment risk
- **Location:** HostEvent, PlaceEdit, StartCommunity

---

## 3. FLOW CLARITY

### ✅ Strengths
- Clear navigation structure
- Breadcrumbs/back links on detail pages
- Empty states guide next steps

### ❌ Issues

#### **3.1 Unclear Purpose**
- **Problem:** Some pages don't clearly state what they are
  - Dashboard: "Welcome back, {name}" but what can I do here?
  - MyEvents: "Events you host, facilitate, or are attending" but how do I create one?
  - Communities: What's the difference between Communities, Venues, Events tabs?
- **Impact:** Users don't understand the page's purpose
- **Location:** Dashboard, MyEvents, Communities

#### **3.2 Missing Next Steps**
- **Problem:** After creating event, unclear what happens next
  - No indication that event needs approval
  - No guidance on how to publish
  - No explanation of lifecycle states
- **Impact:** Users create events but don't know how to make them bookable
- **Location:** HostEvent, MyEvents, ListingDetail

#### **3.3 State Transitions Not Obvious**
- **Problem:** Event lifecycle states not visible or explained
  - No status badges showing "Proposed", "Approved", "Published"
  - No approval/publish buttons visible
  - No explanation of what each state means
- **Impact:** Users don't understand why events aren't bookable
- **Location:** MyEvents, ListingDetail, HostDashboard

#### **3.4 Unclear User Roles**
- **Problem:** Role-based actions not clearly differentiated
  - Host vs Facilitator vs Member actions look the same
  - No indication of what you can/can't do based on role
- **Impact:** Users try actions they can't perform
- **Location:** ListingDetail, CommunityDetail, PlaceDetail

---

## 4. EVENT LIFECYCLE VISIBILITY

### ❌ Critical Issues

#### **4.1 Status Not Displayed**
- **Problem:** Event status (proposed/approved/published) not shown anywhere in UI
  - MyEvents shows "visibility" (draft/unlisted/public) but not lifecycle status
  - ListingDetail doesn't show status
  - HostDashboard doesn't show status
- **Impact:** Users can't understand why events aren't bookable
- **Location:** MyEvents, ListingDetail, HostDashboard, Communities

#### **4.2 No Status Badges**
- **Problem:** No visual indicators for event lifecycle states
  - Should have badges: "Proposed", "Awaiting Approval", "Approved", "Published"
  - Should use color coding: amber (pending), blue (approved), green (published)
- **Impact:** Status is invisible to users
- **Location:** All event displays

#### **4.3 System Language Exposed**
- **Problem:** If status is shown, uses technical terms
  - "venue_approved" instead of "Approved by Venue"
  - "proposed" instead of "Awaiting Approval"
- **Impact:** Confusing, feels technical
- **Location:** Backend data (if exposed)

#### **4.4 No Approval/Publish UI**
- **Problem:** No buttons or actions for:
  - Place hosts to approve events
  - Event creators to publish approved events
  - No indication of who can perform these actions
- **Impact:** Workflow is broken, users can't complete the flow
- **Location:** ListingDetail, MyEvents, HostDashboard

---

## 5. MICROCOPY

### ✅ Strengths
- Some friendly language: "Find your place. Or share yours."
- Empty states use encouraging tone

### ❌ Issues

#### **5.1 Technical Terms**
- **Problem:** Too many technical/system terms
  - "visibility" → should be "Status" or "Visibility Status"
  - "listingType" → should be "Type" or hidden
  - "createdBy" → should be "Created by" or "Host"
  - "venue_approved" → should be "Approved" or "Ready to Publish"
- **Impact:** Feels like admin interface, not user-friendly
- **Location:** All pages

#### **5.2 Button Labels**
- **Problem:** Some buttons use weak verbs
  - "View all" → could be "See all" or "Browse all"
  - "Create Event" → good, but "Host an Event" is better
  - "List a Place" → good
  - "Invite collaborator" → "Invite Collaborator" (capitalize)
- **Impact:** Less engaging, less clear
- **Location:** All pages

#### **5.3 Form Labels**
- **Problem:** Some labels are unclear
  - "Place (Optional)" → "Select a Venue (Optional)" is clearer
  - "Start Date & Time" → "When does it start?" is more conversational
  - "Capacity (Optional)" → "How many people? (Optional)"
- **Impact:** Forms feel more technical than friendly
- **Location:** HostEvent, PlaceEdit

#### **5.4 Error Messages**
- **Problem:** Generic error messages
  - "Failed to load" → "We couldn't load your events. Please try again."
  - "Failed to create event" → "We couldn't create your event. Check the details and try again."
- **Impact:** Less helpful, less reassuring
- **Location:** All pages with error handling

---

## 6. LAYOUT CONSISTENCY

### ✅ Strengths
- Consistent card component usage
- Consistent border radius (`rounded-xl`, `rounded-2xl`)
- Consistent color palette (stone grays, primary-200)

### ❌ Issues

#### **6.1 Padding Inconsistency**
- **Problem:** Container padding varies
  - Some: `px-4 sm:px-6 lg:px-8 py-12 sm:py-16`
  - Others: `px-4 sm:px-6 lg:px-8 py-10 sm:py-14`
  - Cards: `p-4`, `p-6`, `p-8` mixed
- **Impact:** Feels unpolished, lacks rhythm
- **Location:** All pages

#### **6.2 Button Style Inconsistency**
- **Problem:** Button variants used inconsistently
  - Some primary actions use `variant="primary"`
  - Others use `variant="secondary"` for primary actions
  - Some use custom classes instead of variants
  - Size varies: `text-sm`, `text-base` mixed
- **Impact:** Unclear which actions are primary
- **Location:** All pages

#### **6.3 Card Layout Inconsistency**
- **Problem:** Cards have different internal spacing
  - Some: `p-4` with `mb-2` for headings
  - Others: `p-6` with `mb-4` for headings
  - Some cards have borders, others rely on shadow
- **Impact:** Feels inconsistent, less polished
- **Location:** HostDashboard, Dashboard, MyPlaces, Communities

#### **6.4 Status Badge Inconsistency**
- **Problem:** Status badges styled differently across pages
  - HostDashboard: `px-2.5 py-0.5 text-xs`
  - MyBookings: `px-2 py-0.5 text-xs` (different padding)
  - MyPlaces: `px-2.5 py-0.5 text-xs` but different colors
  - No shared component or consistent styling
- **Impact:** Looks unprofessional, inconsistent
- **Location:** HostDashboard, MyBookings, MyPlaces, MyEvents

---

## 7. EMOTIONAL TONE

### ✅ Strengths
- Hero section feels welcoming
- Empty states are encouraging
- Color palette is calm (stone grays)

### ❌ Issues

#### **7.1 Feels Administrative**
- **Problem:** Too much data, not enough warmth
  - HostDashboard: Stats feel like a dashboard, not a welcoming space
  - MyEvents: List view feels like admin panel
  - Forms: Very functional, not inviting
- **Impact:** Feels like a tool, not a community platform
- **Location:** HostDashboard, MyEvents, Forms

#### **7.2 Cluttered**
- **Problem:** Too much information density
  - HostDashboard: Stats + actions + 3 content sections = overwhelming
  - Communities: Search + tabs + filters + content = busy
  - ListingDetail: Image + details + booking + related = dense
- **Impact:** Feels stressful, not calm
- **Location:** HostDashboard, Communities, ListingDetail

#### **7.3 Insufficient Whitespace**
- **Problem:** Content feels cramped
  - Cards: `p-4` feels tight for content
  - Sections: `mb-10` but content inside feels dense
  - Forms: Fields too close together (`space-y-6` but feels tight)
- **Impact:** Feels rushed, not spacious
- **Location:** All pages, especially forms

#### **7.4 Missing Delight**
- **Problem:** No moments of delight or personality
  - No animations beyond hover
  - No celebratory moments (e.g., "Event created! 🎉")
  - No friendly illustrations or icons
  - Very functional, not emotional
- **Impact:** Feels sterile, not engaging
- **Location:** All pages

---

## SUMMARY OF KEY ISSUES

### 🔴 Critical (Blocks Core Functionality)
1. **Event lifecycle status not visible** - Users can't see if events are proposed/approved/published
2. **No approval/publish UI** - Workflow is incomplete
3. **Unclear next steps** - Users don't know what to do after creating events

### 🟡 High Priority (Significant UX Impact)
4. **Inconsistent visual hierarchy** - Hard to scan and understand pages
5. **Too many decisions** - Overwhelming, especially HostDashboard
6. **Technical language** - Feels like admin tool, not user-friendly
7. **Inconsistent spacing** - Feels unpolished
8. **Status badges inconsistent** - Looks unprofessional

### 🟢 Medium Priority (Polish & Refinement)
9. **Button styles inconsistent** - Unclear primary actions
10. **Card layouts inconsistent** - Less polished feel
11. **Forms overwhelming** - High abandonment risk
12. **Insufficient whitespace** - Feels cramped
13. **Missing delight** - Feels sterile

---

## RECOMMENDED IMPROVEMENTS

### Phase 1: Critical Fixes
1. Add event status badges (Proposed, Approved, Published) with color coding
2. Add approval/publish buttons with clear permissions
3. Add status explanations and next-step guidance
4. Replace technical terms with user-friendly language

### Phase 2: Visual Hierarchy
5. Standardize heading sizes (h1: 3xl, h2: 2xl, h3: xl, h4: lg)
6. Establish clear primary action per page
7. Create consistent spacing system (4/6/8/12/16 scale)
8. Improve visual weight balance (larger primary actions, smaller secondary)

### Phase 3: Cognitive Load Reduction
9. Simplify HostDashboard (group related content, progressive disclosure)
10. Hide disabled features (don't show "Coming soon")
11. Group form fields logically with clear sections
12. Reduce visible decisions per page

### Phase 4: Consistency & Polish
13. Standardize button variants and sizes
14. Create shared StatusBadge component
15. Standardize card padding and spacing
16. Increase whitespace throughout

### Phase 5: Emotional Tone
17. Add more whitespace for breathing room
18. Add subtle animations and transitions
19. Improve microcopy to be more conversational
20. Add celebratory moments (success states)

---

**Next Step:** Review this audit and confirm which improvements to prioritize before implementation.
