# Database (SQLite + Redis)

TravelMate AI stores data in **SQLite** instead of JSON files.

## Redis (NoSQL)

Live chat/socket presence (who's online, and which socket they're connected on) is stored in **Redis**, not SQLite. That state is ephemeral and tied to a running process — it doesn't belong in the relational schema, and an in-memory `Map` would be lost on every server restart. Redis's key/hash model is a natural fit for this kind of transient, high-churn data. See `backend/services/presenceStore.js`.

Requires a local Redis instance (`brew install redis && brew services start redis`), configured via `REDIS_URL` (defaults to `redis://localhost:6379`). If Redis is unreachable, presence degrades gracefully (empty online list) rather than crashing the server — chat messages and history still work normally through SQLite.

## Location

`backend/data/travelmate.db`

Override with environment variable:

```env
DATABASE_PATH=C:\path\to\custom.db
```

## Tables

| Table | Stores |
|-------|--------|
| `users` | Login accounts (hashed passwords) |
| `trip_plans` | Saved itineraries (auto-saved when you click **Create itinerary**) |
| `messages` | Group chat history |

## First run

1. `cd backend && npm install`
2. `npm start`

On startup the server will:

- Create the database file if missing
- Import existing `users.json`, `itineraries.json`, and `messages.json` **once** (if tables are empty)
- Create default admin if no users exist: `admin@travelmate.ai` / `Test1234`

## Check it works

Open: http://localhost:4000/api/health

```json
{ "ok": true, "database": "...", "storage": "sqlite" }
```

## Backup

Copy `backend/data/travelmate.db` to back up all data.

## Old JSON files

`users.json`, `itineraries.json`, and `messages.json` are no longer written to after migration. You can keep them as backups or delete them once you confirm the database has your data.
