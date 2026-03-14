# Admin CMS Plan: Content Management System

## Overview

Build an admin panel for managing all platform content (communities, venues, events, users, and related entities). The plan aligns with existing auth, API structure, and Vercel serverless limits.

---

## 1. Current State

### Existing
- **Admin auth**: `isAdmin(user)` — `role === 'admin'` or `ADMIN_EMAILS` env
- **Navbar**: Links to `/admin` (route missing → 404)
- **API admin actions**: PATCH/DELETE on communities, places, events (by owner or admin)
- **Admin APIs**: `host-applications` (review), `community-link-requests` (community admins), `admin/set-admin`

### Constraints
- **Vercel Hobby**: Max 12 serverless functions (avoid adding more if possible)
- **DB**: Neon PostgreSQL — communities, places, events, users, bookings, host_applications, community_link_requests, object_memberships

---

## 2. Admin Panel Scope

### 2.1 Content Types to Manage

| Content Type | Create | Edit | Delete | List/Filter | Notes |
|-------------|--------|------|--------|-------------|-------|
| **Communities** | ✓ | ✓ | ✓ | ✓ | name, slug, description, visibility, locationArea, type, imageUrl |
| **Venues (Places)** | ✓ | ✓ | ✓ | ✓ | title, description, address, communityId, visibility |
| **Events** | ✓ | ✓ | ✓ | ✓ | title, description, placeId, communityId, startAt, endAt, capacity, visibility |
| **Users** | — | ✓ (role) | — | ✓ | role, fullName; view only for most fields |
| **Bookings** | — | ✓ (status) | — | ✓ | status (pending/confirmed/cancelled) |
| **Host applications** | — | ✓ (approve/reject) | — | ✓ | Already has API |
| **Community link requests** | — | ✓ (approve/reject) | — | ✓ | Per-community, already has API |

### 2.2 Static / Marketing Content (Optional Phase 2)

| Content | Purpose |
|---------|---------|
| Homepage hero / featured content | Configurable copy, images |
| FAQ, About, Terms, Privacy | Editable markdown/HTML |
| Site-wide settings | Announcements, maintenance mode |

---

## 3. Architecture

### 3.1 Frontend Structure

```
src/
├── pages/
│   └── admin/
│       ├── AdminLayout.jsx        # Sidebar + header, admin-only wrapper
│       ├── AdminDashboard.jsx     # Overview, stats, quick actions
│       ├── communities/
│       │   ├── AdminCommunitiesList.jsx
│       │   └── AdminCommunityEdit.jsx
│       ├── venues/
│       │   ├── AdminVenuesList.jsx
│       │   └── AdminVenueEdit.jsx
│       ├── events/
│       │   ├── AdminEventsList.jsx
│       │   └── AdminEventEdit.jsx
│       ├── users/
│       │   └── AdminUsersList.jsx
│       ├── bookings/
│       │   └── AdminBookingsList.jsx
│       ├── host-applications/
│       │   └── AdminHostApplications.jsx
│       └── link-requests/
│           └── AdminLinkRequests.jsx
└── components/
    └── admin/
        ├── AdminSidebar.jsx
        ├── AdminTable.jsx
        └── AdminFormFields.jsx
```

### 3.2 Routing

```
/admin                          → AdminDashboard
/admin/communities              → AdminCommunitiesList
/admin/communities/:slug/edit   → AdminCommunityEdit
/admin/venues                   → AdminVenuesList
/admin/venues/:id/edit          → AdminVenueEdit
/admin/events                   → AdminEventsList
/admin/events/:id/edit          → AdminEventEdit
/admin/users                    → AdminUsersList
/admin/bookings                 → AdminBookingsList
/admin/host-applications        → AdminHostApplications
/admin/link-requests            → AdminLinkRequests (or per-community)
```

All under a `ProtectedRoute` that also checks `user?.isAdmin`; redirect to `/login` or `/` if not admin.

### 3.3 API Strategy

**Reuse existing endpoints** to stay within Vercel function limits:

| Action | Endpoint | Method |
|--------|----------|--------|
| List communities | `/api/communities` (public list) | GET |
| Get community | `/api/communities?slug=xxx` | GET |
| Update community | `/api/communities?slug=xxx` | PATCH |
| Delete community | `/api/communities?slug=xxx` | DELETE |
| Create community | `/api/communities` | POST |
| List places | `/api/places` or `/api/explore` | GET |
| Get/Update/Delete place | `/api/places?id=xxx` | GET/PATCH/DELETE |
| List events | `/api/events` | GET |
| Get/Update/Delete event | `/api/events?id=xxx` | GET/PATCH/DELETE |

**New endpoints only if needed**:

- `GET /api/admin/dashboard` — aggregated counts (communities, places, events, bookings, pending host apps) — **merge into existing route** or extend explore
- `GET /api/admin/users` — list users with filters — **new** (consider merging into `api/user` with `?list=true&admin=1`)
- `GET /api/admin/bookings` — list all bookings — **new** or extend `api/bookings` with `?admin=1`

To avoid new functions, extend:

1. `api/communities` — add `?admin=1` to return draft/unlisted for list
2. `api/places` — add `?admin=1` for full list
3. `api/events` — add `?admin=1` for full list
4. `api/bookings` — add `?all=1` for admin list (already checks `user.role === 'admin'`)
5. `api/user/profile` or new `api/user/index` — add `?list=1` for admin user list

---

## 4. Implementation Phases

### Phase 1: Admin Shell & Core Content (2–3 days)

1. **Admin layout & routing**
   - Create `AdminLayout` with sidebar navigation
   - Add `/admin/*` routes
   - `AdminRoute` guard: redirect non-admins

2. **Communities CMS**
   - List (table with search, filters: visibility, type)
   - Edit form (reuse fields from CommunityEdit, add admin-only visibility)
   - Create new community
   - Delete with confirmation

3. **Venues & Events CMS**
   - List pages with search and filters
   - Edit forms (reuse PlaceEdit / HostEvent/FacilitateEvent patterns)
   - Create / Delete

### Phase 2: Users & Bookings (1–2 days)

4. **Users**
   - List with search (email, name)
   - View user detail
   - Update role (user → host, etc.)

5. **Bookings**
   - List all bookings with filters (status, user, event)
   - Update status (pending → confirmed/cancelled)

### Phase 3: Review Workflows (1 day)

6. **Host applications**
   - List pending applications
   - Approve / reject (API exists)

7. **Community link requests**
   - List by community or global
   - Approve / reject

### Phase 4: Dashboard & Polish (1 day)

8. **Admin dashboard**
   - Counts: communities, venues, events, bookings, pending host apps
   - Recent activity or quick links

9. **UX**
   - Loading states, error handling
   - Toast notifications for success/error
   - Breadcrumbs

---

## 5. UI/UX Guidelines

- **Layout**: Sidebar + main content; consistent with existing app (stone/neutral palette)
- **Tables**: Sortable columns, pagination, basic search
- **Forms**: Reuse `Button`, inputs from existing pages
- **Confirmation**: `window.confirm` or simple modal for delete
- **Empty states**: Clear message when no items

---

## 6. Security

- All admin routes: `ProtectedRoute` + `user?.isAdmin` check
- API: Existing `isAdmin(user)` used for PATCH/DELETE
- New admin list endpoints: require `requireAuth` + `isAdmin` before returning data

---

## 7. Optional Enhancements (Later)

- **Bulk actions**: Select multiple items, bulk delete/visibility change
- **Activity log**: Track who changed what and when
- **Static content CMS**: Edit FAQ, About, etc. (needs new table + API)
- **Image upload**: Direct upload for community/place/event images (currently URLs)
- **Export**: CSV export of communities, events, bookings

---

## 8. File Checklist

| File | Action |
|------|--------|
| `src/pages/admin/AdminLayout.jsx` | Create |
| `src/pages/admin/AdminDashboard.jsx` | Create |
| `src/pages/admin/communities/AdminCommunitiesList.jsx` | Create |
| `src/pages/admin/communities/AdminCommunityEdit.jsx` | Create |
| `src/pages/admin/venues/AdminVenuesList.jsx` | Create |
| `src/pages/admin/venues/AdminVenueEdit.jsx` | Create |
| `src/pages/admin/events/AdminEventsList.jsx` | Create |
| `src/pages/admin/events/AdminEventEdit.jsx` | Create |
| `src/components/admin/AdminSidebar.jsx` | Create |
| `src/components/common/AdminRoute.jsx` | Create |
| `src/router/index.jsx` | Add `/admin` routes |
| `api/*` | Extend with `?admin=1` / `?list=1` where needed |
