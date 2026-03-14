# Admin Setup

To make **Vik Nithy** (or any user) an admin who can edit and delete all communities, venues, and events:

## Option 1: Use ADMIN_EMAILS (recommended)

1. In Vercel (or your `.env`), add:
   ```
   ADMIN_EMAILS=vik@yourdomain.com
   ```
2. Use a comma-separated list for multiple admins:
   ```
   ADMIN_EMAILS=vik@example.com,admin@example.com
   ```
3. Sign in with that email — you'll have full edit/delete access on communities, venues, and events.

## Option 2: Set admin role in database

1. Set `ADMIN_SECRET` in Vercel (e.g. a random string like `your-secret-123`).
2. Sign in as Vik Nithy.
3. Call the API (e.g. from browser console or curl):
   ```bash
   curl -X POST https://your-app.vercel.app/api/admin/set-admin \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"secret":"your-secret-123"}'
   ```
4. This sets `role=admin` in the database for your user. You'll need to log out and back in (or refresh) for `isAdmin` to be picked up.

## What admins can do

- **Communities**: Edit, delete, manage link requests
- **Venues (places)**: Edit, delete
- **Events**: Edit, delete

Facilitators and hosts are currently mock data only; there is no backend to edit/delete them.
