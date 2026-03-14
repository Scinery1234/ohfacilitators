## Core Front End Stack

### React + Vite

**WHY**

- API is REST-based, JWT-secured - react integrates well 
- Industry-standard. Large ecosystem
- Easily scalable (assignment + portfolio piece -> real-world app)
- Vite gives fast dev startup compared to CRA
- best balance of simplicity, industry relevence + safe otion for htis assignment

**Alternatives**

- Next.js - also good option but adds SSR complexity 
- Vue - React aligns beter with node backend
- Svelte - less industry use

### API communication - axios

**WHY**

- Axios over fetch because: interceptors for JWT (Authorization: Bearer <token>)
- Centralised error handling
cleaner request/response logic
- Good match for backend auth model

### zod (forms and validation)

- Already use in backend
- Same schems logic on both fornt/back
- Clear validation errors before API call
- shows architectural consistency 

### Tailwind CSS (UI styling)

**WHY**

- Have installed 'classic' tailwindcss with postCSS pipeline(not the vite plugin shortcut) - faster setup but less learning, less control and newer so less industry practice

- fast build for layouts
- widely used in modern startups
- works well when creating dashboards (admin/host views)

**Alternatives**

- MUI - pre built components (tables,models, forms)
- tradeoff is less styling control and heavier bundle (since still studying, want to have some creative control for learning)

---

## MAIN CONTENT

### Pages:

- HOME (/)
- Explore (Spaces & Events) - Another page for individual clicked space/event that then leads to bookings page? 
- Login (all users)
- Signup/Register (User signup - Everyone must signup to become user, user can then submit host application to change role)
- Become a host signup (form)
- Bookings - protected, different for hosts or users on their dashboard
- Listing Detail - Page that provides space/event info for a specific listing (opens when clicked by user in explore page)
- Not Found - 404 not found, links back to home or contact pages.
- Contact us - Contact submit form (dummy).

### Code Quality and Formatting:

Airbnb styling compatible

- ESLint enforces code quality rules:
    - Catches bugs and errors
    - Enforces react
    - Ensures consistent naming and coding patterns
```bash 
npm run lint # Checks for issues
npm run lin:fix # Auto-fixes issues
```

- Prettier
    - Automtic formatting
    - Consistent spacing, quotes, line breaks
```bash
npm run format # Format all files
npm run format:check # Format check
```

---

## UI/Design Style
We've developed a customised design system using Tailwind CSS v4 with a defined:

- Color palette (primary burgundy, secondary cream, white neutrals)
- Typography system (Inter for body, Poppins for headings) **WILL CHANGE FONTS WHEN REFINING STYLING**
- Spacing scale (Tailwind's 4px base unit)
- Component library (buttons, cards, forms with consistent styling) **TO CREATE THESE FILES IN COMPONENTS/UI**
- Responsive breakpoints

See docs/STYLE_GUIDE.md for complete visual design documentation. **TO CREATE STILL. LINK TO THE DOC**

### Component Patterns

All UI components follow consistent patterns:

- Reusable components in src/components/ui/ **to complete**
- Props-based customisation
- Accessible by default (ARIA labels, keyboard navigation)
- Mobile-first responsive design

### Stock images from pexels.com

- Stock photos, royalty free

### Time constraints

- Made user locale 'en' as default for this project due to time constraints. Option to integrate when scaling project 
- Contact us page for submission. Would ideally be sent to admin dashboard to review. If time doesn't allow, may have to be dummy form, or just an email address provided to email admin for support.


### User Journey for Becoming a Host:

Public User → Register/Login → Apply to Become Host → Admin Reviews → Approved → Login as Host

