# oh facilitators API

Backend API for oh facilitators — authentication, users.

## Setup

```bash
cd backend
npm install
```

## Run

```bash
npm start
```

Or with auto-reload:

```bash
npm run dev
```

API runs at `http://localhost:5000`.

## Endpoints

- `POST /auth/register` — Create account `{ fullName, email, password, locale? }`
- `POST /auth/login` — Sign in `{ email, password }`
- `GET /users/me` — Current user (requires `Authorization: Bearer <token>`)

## Database

SQLite — `ohfacilitators.db` is created on first run. No setup required.

## Environment

- `PORT` — API port (default 5000)
- `JWT_SECRET` — Secret for JWT signing (set in production!)
