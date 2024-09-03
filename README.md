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