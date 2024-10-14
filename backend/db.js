const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { normalizeTimestamp, normalizeDate, sqlNow, normalizeStoredDates } = require('./utils/dateFormat');

const dataDir = path.join(__dirname, 'data');
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'travelmate.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('busy_timeout = 5000');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const UNUSED_TABLES = ['trip_plan_items'];

function pruneUnusedTables() {
  db.pragma('foreign_keys = OFF');
  for (const table of UNUSED_TABLES) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
  db.pragma('foreign_keys = ON');
}

function ensureColumn(table, column, sql) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((col) => col.name === column)) {
    db.exec(sql);
  }
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      key TEXT NOT NULL,
      value TEXT,
      description TEXT,
      created_by TEXT,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(user_id, key)
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_by TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_by TEXT,
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_by TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS chat_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_private INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room TEXT NOT NULL DEFAULT 'global',
      from_user_id TEXT NOT NULL,
      to_user_id TEXT,
      content TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(room) REFERENCES chat_rooms(id) ON DELETE SET NULL,
      FOREIGN KEY(from_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY(to_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT,
      price TEXT,
      rating REAL,
      description TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS guides (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      language TEXT,
      specialty TEXT,
      contact TEXT,
      rating REAL DEFAULT 0,
      bio TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS travel_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS booking_suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      contact TEXT,
      phone TEXT,
      email TEXT,
      details TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS trip_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      destination_id TEXT,
      days INTEGER NOT NULL,
      style TEXT NOT NULL DEFAULT 'Balanced',
      budget TEXT DEFAULT '',
      custom_prompt TEXT DEFAULT '',
      source TEXT,
      user_id TEXT,
      planned_date TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(destination_id) REFERENCES destinations(id) ON DELETE SET NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS itinerary_items (
      id TEXT PRIMARY KEY,
      trip_plan_id TEXT NOT NULL,
      day INTEGER NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(trip_plan_id) REFERENCES trip_plans(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      trip_plan_id TEXT,
      supplier_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      date TEXT NOT NULL,
      amount REAL DEFAULT 0,
      location TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(trip_plan_id) REFERENCES trip_plans(id) ON DELETE SET NULL,
      FOREIGN KEY(supplier_id) REFERENCES booking_suppliers(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      booking_id TEXT,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'Unpaid',
      pdf_path TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      booking_id TEXT,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'Pending',
      method TEXT,
      paid_at TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    /* expense_categories and expenses tables removed per request */

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      entity TEXT,
      entity_id TEXT,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_by TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      comment TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      travel_group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_by TEXT,
      updated_by TEXT,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(travel_group_id) REFERENCES travel_groups(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(travel_group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_bookings_trip_plan_id ON bookings(trip_plan_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_supplier_id ON bookings(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(travel_group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name);
    CREATE INDEX IF NOT EXISTS idx_destinations_location ON destinations(location);
  `);

  ensureColumn('trip_plans', 'user_id', 'ALTER TABLE trip_plans ADD COLUMN user_id TEXT');
  ensureColumn('trip_plans', 'created_by', 'ALTER TABLE trip_plans ADD COLUMN created_by TEXT');
  ensureColumn('trip_plans', 'updated_by', 'ALTER TABLE trip_plans ADD COLUMN updated_by TEXT');
  ensureColumn('trip_plans', 'created_at', 'ALTER TABLE trip_plans ADD COLUMN created_at TEXT');
  ensureColumn('trip_plans', 'updated_at', 'ALTER TABLE trip_plans ADD COLUMN updated_at TEXT');
  ensureColumn('bookings', 'trip_plan_id', 'ALTER TABLE bookings ADD COLUMN trip_plan_id TEXT');
  ensureColumn('bookings', 'supplier_id', 'ALTER TABLE bookings ADD COLUMN supplier_id TEXT');
  ensureColumn('bookings', 'created_by', 'ALTER TABLE bookings ADD COLUMN created_by TEXT');
  ensureColumn('bookings', 'updated_by', 'ALTER TABLE bookings ADD COLUMN updated_by TEXT');
  ensureColumn('notifications', 'user_id', 'ALTER TABLE notifications ADD COLUMN user_id TEXT');
  ensureColumn('notifications', 'is_read', 'ALTER TABLE notifications ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0');
  ensureColumn('notifications', 'created_by', 'ALTER TABLE notifications ADD COLUMN created_by TEXT');
  ensureColumn('notifications', 'updated_by', 'ALTER TABLE notifications ADD COLUMN updated_by TEXT');
  ensureColumn('notifications', 'created_at', 'ALTER TABLE notifications ADD COLUMN created_at TEXT');
  ensureColumn('notifications', 'updated_at', 'ALTER TABLE notifications ADD COLUMN updated_at TEXT');
  ensureColumn('messages', 'created_by', 'ALTER TABLE messages ADD COLUMN created_by TEXT');
  ensureColumn('messages', 'updated_by', 'ALTER TABLE messages ADD COLUMN updated_by TEXT');
  ensureColumn('messages', 'created_at', 'ALTER TABLE messages ADD COLUMN created_at TEXT');
  ensureColumn('messages', 'updated_at', 'ALTER TABLE messages ADD COLUMN updated_at TEXT');
  ensureColumn('destinations', 'created_by', 'ALTER TABLE destinations ADD COLUMN created_by TEXT');
  ensureColumn('destinations', 'updated_by', 'ALTER TABLE destinations ADD COLUMN updated_by TEXT');
  ensureColumn('destinations', 'created_at', 'ALTER TABLE destinations ADD COLUMN created_at TEXT');
  ensureColumn('destinations', 'updated_at', 'ALTER TABLE destinations ADD COLUMN updated_at TEXT');
  ensureColumn('users', 'is_active', 'ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'created_by', 'ALTER TABLE users ADD COLUMN created_by TEXT');
  ensureColumn('users', 'updated_by', 'ALTER TABLE users ADD COLUMN updated_by TEXT');
  ensureColumn('users', 'updated_at', 'ALTER TABLE users ADD COLUMN updated_at TEXT');
  ensureColumn('users', 'created_at', 'ALTER TABLE users ADD COLUMN created_at TEXT');
  ensureColumn('permissions', 'created_by', 'ALTER TABLE permissions ADD COLUMN created_by TEXT');
  ensureColumn('permissions', 'updated_by', 'ALTER TABLE permissions ADD COLUMN updated_by TEXT');
  ensureColumn('permissions', 'created_at', 'ALTER TABLE permissions ADD COLUMN created_at TEXT');
  ensureColumn('permissions', 'updated_at', 'ALTER TABLE permissions ADD COLUMN updated_at TEXT');
  ensureColumn('roles', 'created_by', 'ALTER TABLE roles ADD COLUMN created_by TEXT');
  ensureColumn('roles', 'updated_by', 'ALTER TABLE roles ADD COLUMN updated_by TEXT');
  ensureColumn('roles', 'created_at', 'ALTER TABLE roles ADD COLUMN created_at TEXT');
  ensureColumn('roles', 'updated_at', 'ALTER TABLE roles ADD COLUMN updated_at TEXT');
  ensureColumn('settings', 'created_by', 'ALTER TABLE settings ADD COLUMN created_by TEXT');
  ensureColumn('settings', 'updated_by', 'ALTER TABLE settings ADD COLUMN updated_by TEXT');
  ensureColumn('settings', 'created_at', 'ALTER TABLE settings ADD COLUMN created_at TEXT');
  ensureColumn('settings', 'description', 'ALTER TABLE settings ADD COLUMN description TEXT');
  ensureColumn('refresh_tokens', 'created_by', 'ALTER TABLE refresh_tokens ADD COLUMN created_by TEXT');
  ensureColumn('refresh_tokens', 'updated_by', 'ALTER TABLE refresh_tokens ADD COLUMN updated_by TEXT');
  ensureColumn('refresh_tokens', 'updated_at', 'ALTER TABLE refresh_tokens ADD COLUMN updated_at TEXT');
  ensureColumn('role_permissions', 'created_by', 'ALTER TABLE role_permissions ADD COLUMN created_by TEXT');
  ensureColumn('role_permissions', 'updated_by', 'ALTER TABLE role_permissions ADD COLUMN updated_by TEXT');
  ensureColumn('role_permissions', 'created_at', 'ALTER TABLE role_permissions ADD COLUMN created_at TEXT');
  ensureColumn('role_permissions', 'updated_at', 'ALTER TABLE role_permissions ADD COLUMN updated_at TEXT');
  ensureColumn('user_roles', 'created_by', 'ALTER TABLE user_roles ADD COLUMN created_by TEXT');
  ensureColumn('user_roles', 'updated_by', 'ALTER TABLE user_roles ADD COLUMN updated_by TEXT');
  ensureColumn('user_roles', 'created_at', 'ALTER TABLE user_roles ADD COLUMN created_at TEXT');
  ensureColumn('user_roles', 'updated_at', 'ALTER TABLE user_roles ADD COLUMN updated_at TEXT');
  ensureColumn('chat_rooms', 'created_by', 'ALTER TABLE chat_rooms ADD COLUMN created_by TEXT');
  ensureColumn('chat_rooms', 'updated_by', 'ALTER TABLE chat_rooms ADD COLUMN updated_by TEXT');
  ensureColumn('chat_rooms', 'updated_at', 'ALTER TABLE chat_rooms ADD COLUMN updated_at TEXT');
  ensureColumn('guides', 'created_by', 'ALTER TABLE guides ADD COLUMN created_by TEXT');
  ensureColumn('guides', 'updated_by', 'ALTER TABLE guides ADD COLUMN updated_by TEXT');
  ensureColumn('guides', 'updated_at', 'ALTER TABLE guides ADD COLUMN updated_at TEXT');
  ensureColumn('travel_groups', 'created_by', 'ALTER TABLE travel_groups ADD COLUMN created_by TEXT');
  ensureColumn('travel_groups', 'updated_by', 'ALTER TABLE travel_groups ADD COLUMN updated_by TEXT');
  ensureColumn('travel_groups', 'updated_at', 'ALTER TABLE travel_groups ADD COLUMN updated_at TEXT');
  ensureColumn('booking_suppliers', 'created_by', 'ALTER TABLE booking_suppliers ADD COLUMN created_by TEXT');
  ensureColumn('booking_suppliers', 'updated_by', 'ALTER TABLE booking_suppliers ADD COLUMN updated_by TEXT');
  ensureColumn('booking_suppliers', 'updated_at', 'ALTER TABLE booking_suppliers ADD COLUMN updated_at TEXT');
  ensureColumn('itinerary_items', 'created_by', 'ALTER TABLE itinerary_items ADD COLUMN created_by TEXT');
  ensureColumn('itinerary_items', 'updated_by', 'ALTER TABLE itinerary_items ADD COLUMN updated_by TEXT');
  ensureColumn('itinerary_items', 'created_at', 'ALTER TABLE itinerary_items ADD COLUMN created_at TEXT');
  ensureColumn('itinerary_items', 'updated_at', 'ALTER TABLE itinerary_items ADD COLUMN updated_at TEXT');
  ensureColumn('invoices', 'created_by', 'ALTER TABLE invoices ADD COLUMN created_by TEXT');
  ensureColumn('invoices', 'updated_by', 'ALTER TABLE invoices ADD COLUMN updated_by TEXT');
  ensureColumn('invoices', 'updated_at', 'ALTER TABLE invoices ADD COLUMN updated_at TEXT');
  ensureColumn('payments', 'created_by', 'ALTER TABLE payments ADD COLUMN created_by TEXT');
  ensureColumn('payments', 'updated_by', 'ALTER TABLE payments ADD COLUMN updated_by TEXT');
  ensureColumn('payments', 'updated_at', 'ALTER TABLE payments ADD COLUMN updated_at TEXT');
  ensureColumn('files', 'created_by', 'ALTER TABLE files ADD COLUMN created_by TEXT');
  ensureColumn('files', 'updated_by', 'ALTER TABLE files ADD COLUMN updated_by TEXT');
  ensureColumn('files', 'created_at', 'ALTER TABLE files ADD COLUMN created_at TEXT');
  ensureColumn('files', 'updated_at', 'ALTER TABLE files ADD COLUMN updated_at TEXT');
  ensureColumn('reviews', 'created_by', 'ALTER TABLE reviews ADD COLUMN created_by TEXT');
  ensureColumn('reviews', 'updated_by', 'ALTER TABLE reviews ADD COLUMN updated_by TEXT');
  ensureColumn('reviews', 'updated_at', 'ALTER TABLE reviews ADD COLUMN updated_at TEXT');
  ensureColumn('favorites', 'created_by', 'ALTER TABLE favorites ADD COLUMN created_by TEXT');
  ensureColumn('favorites', 'updated_by', 'ALTER TABLE favorites ADD COLUMN updated_by TEXT');
  ensureColumn('favorites', 'updated_at', 'ALTER TABLE favorites ADD COLUMN updated_at TEXT');
  ensureColumn('group_members', 'created_by', 'ALTER TABLE group_members ADD COLUMN created_by TEXT');
  ensureColumn('group_members', 'updated_by', 'ALTER TABLE group_members ADD COLUMN updated_by TEXT');
  ensureColumn('group_members', 'created_at', 'ALTER TABLE group_members ADD COLUMN created_at TEXT');
  ensureColumn('group_members', 'updated_at', 'ALTER TABLE group_members ADD COLUMN updated_at TEXT');
  ensureColumn('audit_logs', 'created_by', 'ALTER TABLE audit_logs ADD COLUMN created_by TEXT');
  ensureColumn('audit_logs', 'updated_by', 'ALTER TABLE audit_logs ADD COLUMN updated_by TEXT');
  ensureColumn('audit_logs', 'created_at', 'ALTER TABLE audit_logs ADD COLUMN created_at TEXT');
  ensureColumn('audit_logs', 'updated_at', 'ALTER TABLE audit_logs ADD COLUMN updated_at TEXT');

  pruneUnusedTables();

  const { migrateTo3NF } = require('./migrations/to3nf');
  migrateTo3NF(db);

  const { migrateToSpec } = require('./migrations/specCompliance');
  migrateToSpec(db);
}

function initFts() {
  db.exec(`
    DROP TABLE IF EXISTS destinations_fts;
    DROP TABLE IF EXISTS trip_plans_fts;
    DROP TABLE IF EXISTS messages_fts;

    CREATE VIRTUAL TABLE destinations_fts USING fts5(id UNINDEXED, name, description);
    CREATE VIRTUAL TABLE trip_plans_fts USING fts5(id UNINDEXED, name, destination, custom_prompt, items_text);
    CREATE VIRTUAL TABLE messages_fts USING fts5(id UNINDEXED, room, from_email, to_email, content);

    DROP TRIGGER IF EXISTS destinations_ai;
    CREATE TRIGGER destinations_ai AFTER INSERT ON destinations BEGIN
      INSERT INTO destinations_fts(rowid, id, name, description) VALUES (new.rowid, new.id, new.name, new.description);
    END;
    DROP TRIGGER IF EXISTS destinations_au;
    CREATE TRIGGER destinations_au AFTER UPDATE ON destinations BEGIN
      UPDATE destinations_fts SET id = new.id, name = new.name, description = new.description WHERE rowid = old.rowid;
    END;
    DROP TRIGGER IF EXISTS destinations_ad;
    CREATE TRIGGER destinations_ad AFTER DELETE ON destinations BEGIN
      DELETE FROM destinations_fts WHERE rowid = old.rowid;
    END;

    DROP TRIGGER IF EXISTS trip_plans_ai;
    CREATE TRIGGER trip_plans_ai AFTER INSERT ON trip_plans BEGIN
      INSERT INTO trip_plans_fts(rowid, id, name, destination, custom_prompt, items_text)
      VALUES (
        new.rowid,
        new.id,
        new.name,
        COALESCE((SELECT name FROM destinations WHERE id = new.destination_id), ''),
        new.custom_prompt,
        COALESCE((SELECT group_concat(title || ' ' || COALESCE(details, ''), ' ') FROM itinerary_items WHERE trip_plan_id = new.id), '')
      );
    END;
    DROP TRIGGER IF EXISTS trip_plans_au;
    CREATE TRIGGER trip_plans_au AFTER UPDATE ON trip_plans BEGIN
      UPDATE trip_plans_fts
      SET id = new.id,
          name = new.name,
          destination = COALESCE((SELECT name FROM destinations WHERE id = new.destination_id), ''),
          custom_prompt = new.custom_prompt,
          items_text = COALESCE((SELECT group_concat(title || ' ' || COALESCE(details, ''), ' ') FROM itinerary_items WHERE trip_plan_id = new.id), '')
      WHERE rowid = old.rowid;
    END;
    DROP TRIGGER IF EXISTS trip_plans_ad;
    CREATE TRIGGER trip_plans_ad AFTER DELETE ON trip_plans BEGIN
      DELETE FROM trip_plans_fts WHERE rowid = old.rowid;
    END;

    DROP TRIGGER IF EXISTS messages_ai;
    CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, id, room, from_email, to_email, content)
      VALUES (
        new.rowid,
        new.id,
        new.room,
        (SELECT email FROM users WHERE id = new.from_user_id),
        (SELECT email FROM users WHERE id = new.to_user_id),
        new.content
      );
    END;
    DROP TRIGGER IF EXISTS messages_au;
    CREATE TRIGGER messages_au AFTER UPDATE ON messages BEGIN
      UPDATE messages_fts
      SET id = new.id,
          room = new.room,
          from_email = (SELECT email FROM users WHERE id = new.from_user_id),
          to_email = (SELECT email FROM users WHERE id = new.to_user_id),
          content = new.content
      WHERE rowid = old.rowid;
    END;
    DROP TRIGGER IF EXISTS messages_ad;
    CREATE TRIGGER messages_ad AFTER DELETE ON messages BEGIN
      DELETE FROM messages_fts WHERE rowid = old.rowid;
    END;
  `);

  db.exec('DELETE FROM destinations_fts');
  db.exec('DELETE FROM trip_plans_fts');
  db.exec('DELETE FROM messages_fts');

  const destinationRows = db.prepare('SELECT rowid, id, name, description FROM destinations').all();
  const destinationInsert = db.prepare('INSERT INTO destinations_fts(rowid, id, name, description) VALUES (?, ?, ?, ?)');
  const destinationTx = db.transaction((rows) => {
    for (const row of rows) {
      destinationInsert.run(row.rowid, row.id, row.name, row.description);
    }
  });
  destinationTx(destinationRows);

  const planRows = db.prepare(`
    SELECT
      tp.rowid,
      tp.id,
      tp.name,
      COALESCE(d.name, '') AS destination,
      tp.custom_prompt,
      COALESCE((
        SELECT group_concat(ii.title || ' ' || COALESCE(ii.details, ''), ' ')
        FROM itinerary_items ii
        WHERE ii.trip_plan_id = tp.id
      ), '') AS items_text
    FROM trip_plans tp
    LEFT JOIN destinations d ON d.id = tp.destination_id
  `).all();
  const planInsert = db.prepare('INSERT INTO trip_plans_fts(rowid, id, name, destination, custom_prompt, items_text) VALUES (?, ?, ?, ?, ?, ?)');
  const planTx = db.transaction((rows) => {
    for (const row of rows) {
      planInsert.run(row.rowid, row.id, row.name, row.destination, row.custom_prompt, row.items_text);
    }
  });
  planTx(planRows);

  const messageRows = db.prepare(`
    SELECT
      m.rowid,
      m.id,
      m.room,
      fu.email AS from_email,
      tu.email AS to_email,
      m.content