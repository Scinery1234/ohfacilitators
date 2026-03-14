# Implementation Notes - Your Place Frontend

## Current State Analysis

### Routes
- `/` - Home page
- `/explore` - Explore spaces/events (placeholder)
- `/contact-us` - Contact form page
- `/listings/:type/:id` - Listing detail page
- `/login` - Login page
- `/register` - Register page
- `/become-host` - Host application page
- `/bookings` - My Bookings (protected, placeholder)
- `/host` - Host Dashboard (protected, role: host, placeholder)
- `*` - NotFound page

### Existing Pages and Purpose
- **Home**: Landing page with hero section and CTA to explore
- **Explore**: Placeholder page (needs implementation)
- **Login**: Full login form with email/password, uses react-hook-form + zod
- **Register**: Registration page (exists but not reviewed)
- **BecomeHost**: Complex form for host applications with status checking
- **MyBookings**: Placeholder (needs implementation)
- **HostDashboard**: Placeholder (needs implementation)
- **ListingDetail**: Individual listing view (exists but not reviewed)
- **ContactUs**: Contact form (exists but not reviewed)
- **NotFound**: 404 page with navigation

### Styling Approach
- **Tailwind CSS v4** with custom theme
- Custom color palette:
  - Primary: Burgundy (#7b062b, #4a031a) with cream (#fffbf2)
  - Secondary: Brown (#9c744b, #291909)
- Custom fonts:
  - Logo: Chango (cursive)
  - Display/Headings: Inter
  - Body: Inter
- Uses Tailwind's 4px base spacing unit
- Mobile-first responsive design

### Auth Logic
- **AuthContext** exists with:
  - `user` state
  - `loading` state
  - `login()` - calls backend API
  - `register()` - calls backend API
  - `logout()` - clears token and user
- **ProtectedRoute** component exists:
  - Redirects to `/login` if not authenticated
  - Supports role-based protection (e.g., `role="host"`)
- **Current Issue**: Auth depends on backend API calls
  - `getMe()` called on mount if token exists
  - `login()` and `register()` call backend
  - **NEEDS**: Demo auth mode for offline functionality

### API Client
- Uses axios with interceptors
- Base URL from `VITE_API_URL` env var (defaults to localhost:5000)
- Request interceptor adds JWT token from localStorage
- Response interceptor handles 401 errors (redirects to login)
- **Issue**: Typo in Content-Type header ("application.json" should be "application/json")
- **Issue**: Template literal syntax error in Authorization header

### UI Components
- Minimal UI component library:
  - `ErrorMessage.jsx` - exists
  - `loadSpinner.jsx` - exists
- **Missing**: Button, Input, Card, Alert, Spinner, EmptyState components

### Layout Components
- **Layout**: Main layout with Navbar, Outlet, Footer
- **Navbar**: 
  - Has hamburger menu for mobile
  - Shows different links based on user role
  - **Needs**: Better accessibility (Escape key, aria-labels)
- **Footer**: Exists (not reviewed)

### Key Observations
1. Codebase is well-structured with clear separation of concerns
2. Uses modern React patterns (hooks, context)
3. Form validation with zod + react-hook-form
4. Tailwind styling is consistent
5. **Critical Gap**: No demo mode - requires backend for all auth flows
6. **Critical Gap**: Many pages are placeholders
7. **Critical Gap**: No mock data for demo purposes
8. **Critical Gap**: No tests exist

### Next Steps Required
1. Implement demo auth mode (critical)
2. Create UI component library
3. Build out placeholder pages
4. Add mock data
5. Write tests
6. Fix API client bugs
7. Enhance accessibility
8. Create style guide documentation
