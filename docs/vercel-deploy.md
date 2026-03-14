# Deploy to Vercel (frontend + API)

Deploy oh places to Vercel so login and signup work without a separate backend server.

## 1. Database (Neon)

1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Create a project and copy the connection string (e.g. `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`).

## 2. Vercel project

1. Import your GitHub repo into Vercel.
2. **Build settings:**
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

## 3. Environment variables

In Vercel → Project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | A random secret string (e.g. `openssl rand -hex 32`) |
| `VITE_API_URL` | `/api` (so the frontend calls your Vercel API routes) |

## 4. Deploy

Push to GitHub. Vercel will:

- Build the Vite frontend
- Deploy API routes at `/api/hello`, `/api/auth/register`, `/api/auth/login`, `/api/users/me`

## API structure

```
api/
  hello.ts          → GET /api/hello
  auth/register.ts  → POST /api/auth/register
  auth/login.ts     → POST /api/auth/login
  users/me.ts       → GET /api/users/me (requires Bearer token)
```

## Local dev

For local development, the frontend uses `http://localhost:5000` by default. Run the Express backend:

```bash
cd backend && npm start
```

And the frontend:

```bash
npm run dev
```

For local dev with Vercel CLI (runs the serverless API locally):

```bash
npx vercel dev
```

Then the frontend calls `/api` (via Vercel dev), and you’ll need `DATABASE_URL` and `JWT_SECRET` in `.env.local`.
