# Authentication (no 2FA)

Login and signup use **email + password only**. There is no two-factor authentication (2FA) for now.

## Sign up

1. User goes to **Register** (`/register`).
2. Submits: **full name**, **email**, **password**, **confirm password**.
3. Frontend sends `POST /auth/register` with `{ fullName, email, password, locale }`.
4. Backend creates user in DB (password hashed with bcrypt), returns `{ token, user }`.
5. Frontend stores token in `localStorage` and user in auth state, then redirects to home.

## Log in

1. User goes to **Login** (`/login`).
2. Submits: **email**, **password**.
3. Frontend sends `POST /auth/login` with `{ email, password }`.
4. Backend checks credentials, returns `{ token, user }`.
5. Frontend stores token and user, then redirects (or to the page they came from).

## After login

- Token is sent as `Authorization: Bearer <token>` on API requests.
- `GET /users/me` returns the current user when the token is valid.
- Logout clears the token and user state (no backend call).

## Backend

- **Backend:** `backend/routes/auth.js` (register, login) and `backend/routes/users.js` (me).
- **Database:** SQLite `users` table (id, email, fullName, passwordHash, role, locale).
- **No 2FA:** No OTP, no verification codes, no MFA. Email + password only.
