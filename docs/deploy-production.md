# Deploying to ohfacilitators.com (production)

For **login and signup to work** on ohfacilitators.com, the **backend API must be deployed** and the frontend must call it.

## 1. Deploy the backend

The backend (`backend/` folder) must run on a server that's reachable from the internet. Options:

- **Same server as the site** – Run the Node app (e.g. with `pm2` or as a systemd service) and put a reverse proxy in front (e.g. Nginx) so that e.g. `https://ohfacilitators.com/api` forwards to the backend.
- **Subdomain** – Deploy the backend to e.g. **api.ohfacilitators.com** (Railway, Render, Fly.io, or a VPS).
- **Backend-as-a-service** – Host the Node API on Railway, Render, etc.; they give you a URL like `https://ohfacilitators-api.up.railway.app`.

You need a **public URL** for the API (e.g. `https://api.ohfacilitators.com` or `https://ohfacilitators.com/api`).

## 2. Point the frontend at the API

The frontend uses `VITE_API_URL` at **build time**. When you build for production, set it to your API URL:

```bash
VITE_API_URL=https://api.ohfacilitators.com npm run build
```

(Use your real API URL instead of `https://api.ohfacilitators.com`.)

Then upload the new `dist/` to ohfacilitators.com (or redeploy your static hosting).

## 3. CORS

The backend must allow requests from `https://ohfacilitators.com`. The current backend uses `cors({ origin: true })`, which allows any origin. If you restrict CORS later, add `https://ohfacilitators.com` (and `https://www.ohfacilitators.com` if you use it) to the allowed origins.

## Summary

| Step | Action |
|------|--------|
| 1 | Deploy backend → get API URL (e.g. `https://api.ohfacilitators.com`) |
| 2 | Build frontend with `VITE_API_URL=https://api.ohfacilitators.com npm run build` |
| 3 | Deploy the new `dist/` to ohfacilitators.com |

Until the backend is deployed and the frontend is built with `VITE_API_URL`, login/signup on ohfacilitators.com will show: *"We can't reach the server right now. Please try again later."*
