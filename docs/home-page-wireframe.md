# Home Page Wireframe — Business-Optimised Layout

## Purpose & vision (Your Place)

- **What it is:** A platform where people discover and book **spaces** (studios, rooms, venues) and **experiences** (workshops, classes, events), and where others can **host** by sharing their space or running events.
- **Core value:** "Find your place — or share yours." Community, wellness, creativity, and learning in real places with real people.
- **Business goals for the home page:** Build trust, show real inventory, inspire action (explore / sign up / become a host).

---

## Wireframe structure

### 1. Hero
- **Goal:** Immediate clarity + emotional pull.
- **Content:** One clear headline ("Find your place. Or share yours."), one sentence of benefit-led copy, two CTAs (primary: Explore; secondary: Become a host).
- **Visual:** Large hero image (or strong background) showing a real space/experience to set the tone (wellness/creative/community).

### 2. Value props (strip)
- **Goal:** Explain the product in three beats.
- **Content:** Three items: **Spaces** (book studios, rooms, venues), **Experiences** (workshops, classes, events), **Host** (share your space, run events). Icons or small visuals optional.

### 3. Browse by category
- **Goal:** Help visitors self-identify and navigate (SEO + conversion).
- **Content:** Grid of 4–6 categories with image + label (e.g. Creative, Wellness, Learning, Social, Movement, Outdoors). Each links to Explore (with filter when implemented).
- **Visual:** One compelling image per category (from real spaces/events when possible).

### 4. Featured spaces
- **Goal:** Prove there is real, bookable inventory; build desire.
- **Content:** "Spaces to inspire you" (or similar). 3–4 cards: image, title, host name, price, category. Link to listing detail or Explore.
- **Data:** From `mockSpaces` (or API later).

### 5. Upcoming experiences
- **Goal:** Show that the platform is active and event-led.
- **Content:** "Upcoming experiences". 2–3 event cards: image (from venue), title, date/time, host, price. Link to listing or Explore.
- **Data:** From `mockEvents`.

### 6. Meet your hosts (facilitators)
- **Goal:** Trust and human connection; reduce anonymity.
- **Content:** "Hosted by people like you". 3–4 facilitator cards: name, short tagline (e.g. from their space or event). Optional: avatar or placeholder.
- **Data:** Unique hosts from spaces + events.

### 7. How it works
- **Goal:** Reduce friction for both guests and hosts.
- **Content:** Compact. Two flows or one: **Guests** — Find → Book → Enjoy; **Hosts** — Apply → Get approved → List & host. Optional tabs or two columns.

### 8. Final CTA
- **Goal:** Convert visitors who scrolled but didn’t act.
- **Content:** "Ready to find your place?" with primary button (Explore) and secondary link (Become a host).

---

## Layout notes

- **Images:** Used heavily in hero, categories, space cards, and event cards so the page feels tangible and aspirational.
- **Copy:** Short, benefit-led; avoid jargon. Emphasise "your place", "spaces", "experiences", "hosts", "community".
- **CTAs:** Explore and Become a host are always visible (hero + final CTA); Sign up/Login live in nav and can be reinforced in copy where relevant.
- **Mobile:** Same sections; stack vertically; category grid 2 columns; space/event cards stack or horizontal scroll; hosts in a row or grid.
- **Performance:** Lazy-load images below the fold if needed; keep hero image optimised.

This wireframe is implemented in `src/pages/Home.jsx`.
