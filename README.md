# TravelMate AI

Full-stack travel planning platform: React frontend, Node.js/Express backend, SQLite database (24 tables, 3NF), JWT authentication, RBAC, real-time chat (Socket.IO + Redis), and AI-assisted itinerary generation.

---

## Table of contents

1. [Requirements](#requirements)
2. [Quick start (Windows)](#quick-start-windows)
3. [Installation & configuration](#installation--configuration)
4. [Running the project](#running-the-project)
5. [Default login (development)](#default-login-development)
6. [Project structure](#project-structure)
7. [Backend architecture](#backend-architecture)
8. [Database & ERD](#database--erd)
9. [API documentation](#api-documentation)
10. [Security](#security)
11. [Verification scripts](#verification-scripts)
12. [Helpful scripts](#helpful-scripts)

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Included with Node.js |
| **Redis** | 6+ | Optional but recommended for live chat presence |
| **Git** | any | To clone the repository |

---

## Quick start (Windows)

1. Open **PowerShell** or **Command Prompt** in the `TravelMateAI` folder.
2. Double-click **`START.bat`** — or run:

```powershell
npm install
cd backend; npm install; cd ..
npm start
```

3. Open the app at **http://localhost:5173** (frontend only — port 4000 is the API).
4. Log in with `admin@travelmate.ai` / `Test1234` (seeded automatically in development).

---

## Installation & configuration

### 1. Clone and install dependencies

```bash
# From project root (TravelMateAI/)
npm install

cd backend
npm install
cd ..
```

### 2. Environment variables

Copy the example file and adjust values:

```bash
cd backend
copy .env.example .env    # Windows
# cp .env.example .env    # macOS / Linux
```

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes (production)** | Long random string for signing JWTs |
| `NODE_ENV` | No | `development` (default) or `production` |
| `PORT` | No | API port (default `4000`) |
| `FRONTEND_URL` | No | Frontend URL for links (default `http://localhost:5173`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `DATABASE_PATH` | No | SQLite file path (default `./data/travelmate.db`) |
| `JWT_EXPIRY` | No | Access token lifetime (default `15m`) |
| `REDIS_URL` | No | Redis connection (default `redis://localhost:6379`) |
| `OPENAI_API_KEY` | No | Enables AI itinerary generation |
| `SEED_DEFAULT_ADMIN` | No | `true` to create default admin on boot (auto in dev) |

> **Never commit `.env`** with real secrets. Use `.env.example` as a template.

### 3. Redis (live chat presence)

Redis stores ephemeral online-user state for Socket.IO. The app works without it, but presence features are limited.

**Windows (recommended options):**

- [Memurai](https://www.memurai.com/) (Redis-compatible for Windows), or
- Docker: `docker run -d -p 6379:6379 redis`, or
- WSL2: `sudo apt install redis-server && sudo service redis-server start`

**macOS:**

```bash
brew install redis
brew services start redis
```

**Linux:**

```bash
sudo apt install redis-server
sudo systemctl start redis
```

---

## Running the project

### Option A — Both backend + frontend (recommended)

From project root:

```bash
npm start
```

This starts the backend on **http://localhost:4000** and the frontend on **http://localhost:5173**.

### Option B — Separate terminals

**Terminal 1 — Backend:**

```bash
cd backend
npm start
```

**Terminal 2 — Frontend:**

```bash
npm run dev
```

### Option C — Windows batch file

Double-click **`START.bat`** in the project root.

### Health check

```bash
curl http://localhost:4000/api/health
```

---

## Default login (development)

When `SEED_DEFAULT_ADMIN=true` (default in non-production):

| Field | Value |
|-------|-------|
| Email | `admin@travelmate.ai` |
| Password | `Test1234` |
| Role | `admin` |

---

## Project structure

```
TravelMateAI/
├── src/                    # React frontend (Vite + TypeScript + Tailwind)
│   ├── routes/             # Page views
│   ├── components/         # Reusable UI
│   ├── auth/               # Auth context & JWT handling
│   └── services/           # API & Socket.IO clients
├── backend/
│   ├── server.js           # Express bootstrap, CORS, Socket.IO
│   ├── routes/index.js     # API route definitions
│   ├── controllers/        # HTTP layer (14 controllers)
│   ├── services/           # Business logic (15 services)
│   ├── repositories/       # Data access / SQL (15 repositories)
│   ├── middleware/         # JWT auth, role checks
│   ├── migrations/         # Schema normalization (3NF)
│   ├── data/               # SQLite database file
│   ├── scripts/            # DB checks, ERD generator, OpenAPI generator
│   └── openapi.json        # OpenAPI 3.0 specification (all endpoints)
├── docs/
│   └── TravelMateAI-ER-Diagram.drawio   # Entity-Relationship Diagram
├── START.bat               # Windows: start backend + frontend
└── Open ER Diagram.bat     # Windows: open ERD in diagrams.net
```

---

## Backend architecture

The backend follows a **layered architecture**:

```
HTTP Request
    ↓
Routes (routes/index.js)
    ↓
Controllers (controllers/*)     — parse request, send response
    ↓
Services (services/*)           — business rules, validation
    ↓
Repositories (repositories/*)   — SQL queries, SQLite access
    ↓
Database (data/travelmate.db)
```

- **No SQL in controllers** — all database access goes through repositories.
- **Middleware:** `requireAuth` (JWT) and `requireRole('admin')` protect sensitive routes.
- **Real-time:** Socket.IO events (`identify`, `message`) require a valid access token.

---

## Database & ERD

- **Engine:** SQLite via `better-sqlite3`
- **File:** `backend/data/travelmate.db`
- **Schema version:** 3 (`user_version: 3`)
- **24 business tables:**
  - **10 platform (mandatory):** users, roles, user_roles, permissions, role_permissions, refresh_tokens, audit_logs, notifications, settings, files
  - **14 domain:** destinations, trip_plans, itinerary_items, booking_suppliers, bookings, invoices, payments, guides, travel_groups, group_members, chat_rooms, messages, reviews, favorites
- **Normalization:** 3NF, foreign keys, indexes, audit columns (`created_at`, `updated_at`, `created_by`, `updated_by`)

### Open the ERD

| Method | Command / action |
|--------|------------------|
| Windows | Double-click **`Open ER Diagram.bat`** |
| npm | `npm run er:open` |
| Regenerate from schema | `npm run er:diagram` |
| Manual | Open `docs/TravelMateAI-ER-Diagram.drawio` in [diagrams.net](https://app.diagrams.net/) |

---

## NoSQL integration (Redis)

TravelMate AI uses a **polyglot persistence** model:

| Store | Role | Why not SQLite alone? |
|-------|------|------------------------|
| **SQLite** | System of record — users, bookings, trips, RBAC, audit | Relational integrity, 3NF, transactions |
| **Redis** | Ephemeral **online presence** for Socket.IO chat | Per-connection state changes every second; no FK value; must survive independently of a single Node process |

**Implementation:** `backend/services/presenceStore.js` — `HSET` / `HDEL` / `HGETALL` on key `travelmate:online_users`.

**Flow:** User connects → `identify` event → Redis stores `{ email, socketId }` → disconnect removes entry → `presence` broadcast to all clients.

**Graceful degradation:** If Redis is unavailable, chat still works; the online-users list may be empty until Redis is started.

---

## Frontend state & performance

**Redux Toolkit** (`src/store/`) centralizes shared UI state:

| Slice | Purpose | Used by |
|-------|---------|---------|
| `ui` | Menu, backend health, active trip ID, AI panel | `App`, `Dashboard`, `TripPlanner` |
| `notifications` | Live alerts + unread count | `NotificationBell`, `Dashboard` (via `useNotificationsSync`) |
| `search` | Search filters persist across navigation | `SearchPage` |

**Lazy loading:** All route pages load with `React.lazy()` + `Suspense` in `App.tsx`; `AiRecommendation` is also lazy-loaded on the dashboard.

---

## API documentation

All **95 REST endpoints** are documented in OpenAPI 3.0 format.

| Resource | Location |
|----------|----------|
| **OpenAPI spec (JSON)** | `backend/openapi.json` |
| **Swagger UI (interactive)** | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) (backend must be running) |
| **Raw spec URL** | [http://localhost:4000/api/openapi.json](http://localhost:4000/api/openapi.json) |

### Import into Postman

1. Open Postman → **Import** → **File**
2. Select `backend/openapi.json`
3. Set collection variable `baseUrl` = `http://localhost:4000`
4. Call `POST /api/auth/login`, then set `Authorization: Bearer {{accessToken}}`

### Regenerate OpenAPI from routes

```bash
cd backend
npm run docs:openapi
```

### Endpoint groups

| Tag | Examples |
|-----|----------|
| Authentication | login, register, refresh, profile update |
| Itinerary | plans, items, AI generate |
| Chat | rooms, messages, history |
| Bookings | CRUD + suppliers |
| RBAC | roles, permissions, user-roles |
| Billing | invoices, payments |
| Platform | settings, files, guides, travel groups |
| Search & Reports | full-text search, export/import, summary |
| Audit | audit-logs (admin) |

**Public endpoints (no JWT):** `GET /api/health`, `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh`, `GET /api/destinations`

---

## Security

| Feature | Implementation |
|---------|----------------|
| Authentication | JWT access tokens (`Authorization: Bearer …`) |
| Refresh tokens | Stored as SHA-256 hash in `refresh_tokens` table |
| Passwords | bcrypt hashing |
| Authorization | RBAC via `roles` / `user_roles` / `permissions` |
| SQL injection | Parameterized queries (`better-sqlite3` prepared statements) |
| CORS | Whitelist from `CORS_ORIGINS` + localhost in development |
| Secrets | `.env` file (never committed) |
| Socket.IO | JWT verified on `identify` and `message` events |

---

## Verification scripts

Run from `backend/` to validate academic requirements:

```bash
cd backend

node scripts/compliance_check.js      # Database: 24 tables, 3NF, FK, audit columns
node scripts/architecture_check.js    # Layered architecture (no SQL in controllers)
node scripts/security_check.js        # JWT, bcrypt, CORS, refresh token hashing
```

All three should report **pass** before presentation.

---

## Helpful scripts

| Command | Location | Description |
|---------|----------|-------------|
| `npm start` | root | Start backend + frontend |
| `npm run backend` | root | Backend only |
| `npm run dev` | root | Frontend only |
| `npm run kill-ports` | root | Free ports 4000, 5173, 5174 |
| `npm run er:open` | root | Open ERD diagram |
| `npm run er:diagram` | root | Regenerate ERD from schema |
| `npm run save-sample-backend` | root | Save sample trip plan via API |
| `npm run docs:openapi` | backend | Regenerate OpenAPI spec |
| `npm run db:check` | backend | Quick database sanity check |

---

## Pages (frontend)

- Landing page
- Dashboard
- Trip Planner (AI itinerary)
- Bookings
- Destinations
- Reports
- Live chat
- Sign-in / registration

---

## Notes

- Real-time chat uses **Socket.IO**; send `accessToken` on the `identify` event.
- Search supports optional **full-text search (FTS)** via `?fts=true`.
- The app uses real user data only — no mock payloads are loaded automatically.
- For production, set `NODE_ENV=production` and a strong `JWT_SECRET`.
