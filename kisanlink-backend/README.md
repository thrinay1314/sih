# KisanLink backend

A real backend for the KisanLink prototype: accounts are now created and
stored for real (passwords hashed, never plain text), logins are checked
against them, and the admin dashboard's Approve/Remove buttons actually
change data that persists.

## What changed from the pure-frontend prototype

- **Real accounts.** The login screen now has "Create an account" / "Log in"
  modes. `POST /api/register` and `POST /api/login` are handled by the
  backend — there's no more "any details will work."
- **Password security.** Passwords are hashed with **bcrypt** (12 salt
  rounds) before they're ever written to disk. The server never stores or
  logs a plain-text password.
- **Sessions.** A successful login returns a signed **JWT** that expires
  after `SESSION_MINUTES` (30 by default). Every protected request must
  include it; an expired/missing token gets a 401 and the frontend logs the
  user out automatically with a "session expired" message.
- **Brute-force protection.** `/api/register` and `/api/login` are rate
  limited (20 attempts per IP per 15 minutes). Login failures return the
  same generic error whether the mobile number doesn't exist or the
  password is wrong, so an attacker can't use the app to find out which
  numbers are registered.
- **Role-based access control.** Only a logged-in user with `role: "admin"`
  can call the listing-moderation endpoints — a farmer or buyer token gets
  a 403.
- **Fixed: Approve / Remove buttons.** These previously only showed a toast
  and didn't change anything. They now call the backend
  (`POST /api/listings/:id/approve`, `POST /api/listings/:id/remove`),
  the change is written to `data/listings.json`, and the table re-renders
  from the server so the update is real and persists across refresh.
- **Security headers & CORS** via `helmet` and `cors`.

## Storage: JSON files, on purpose

`db.js` stores users and listings in `data/users.json` / `data/listings.json`
instead of a real database. That's a deliberate choice for a hackathon/demo
build: it needs **zero native build tools**, so it runs the same way on any
judge's laptop with just Node.js installed — no Postgres/MySQL server, no
`node-gyp`, no native compiler required.

**Before this goes anywhere near production**, swap the file-based store in
`db.js` for a real database (see "Scaling this up" below) — the rest of the
app (routes, auth, hashing, JWTs) does not need to change, since it only
talks to the small set of functions exported from `db.js`.

## Running it

```bash
cd kisanlink-backend
npm install
npm start
```

Then open **http://localhost:3000** — the frontend is served by the same
Express server, so there's no CORS setup needed for local use.

Optional: copy `.env.example` to `.env` to set `JWT_SECRET` (strongly
recommended before sharing this with anyone) and `SESSION_MINUTES`.

## API summary

| Method | Route                          | Auth           | Purpose                          |
|--------|---------------------------------|----------------|-----------------------------------|
| POST   | `/api/register`                | none           | Create an account                 |
| POST   | `/api/login`                   | none           | Log in, get a JWT                 |
| GET    | `/api/me`                      | any logged-in  | Check the current session is valid|
| GET    | `/api/listings`                | admin only     | List all buyer/mandi listings     |
| POST   | `/api/listings/:id/approve`    | admin only     | Mark a listing verified           |
| POST   | `/api/listings/:id/remove`     | admin only     | Remove a listing                  |

## Scaling this up (for the SIH writeup / judges)

This backend is intentionally minimal so it's easy to read and demo. For a
real deployment, the natural next steps are:

- **Database:** replace the JSON files with Postgres/MySQL (managed, e.g.
  RDS/Cloud SQL), with indexes on `mobile`/`role` and connection pooling.
- **Caching:** put mandi/market prices behind Redis with a short TTL instead
  of hitting a government price API on every request.
- **Horizontal scaling:** the API is already stateless (JWTs, no server-side
  sessions), so it can run behind a load balancer with multiple instances.
- **Rate limiting at the edge:** move brute-force protection to an API
  gateway/CDN (e.g. Cloudflare) in addition to the in-app limiter here.
- **Secrets:** `JWT_SECRET` and DB credentials should come from a secrets
  manager, not a `.env` file, in any real deployment.
- **Observability:** structured logging + a `/health` endpoint for uptime
  monitoring, which the admin dashboard could surface directly to staff.
