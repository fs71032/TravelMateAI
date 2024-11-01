const { sqlNow } = require('../utils/dateFormat');

function resolveUserIdForDb(db, emailOrId) {
  if (!emailOrId || typeof emailOrId !== 'string') return null;
  const value = emailOrId.trim();
  if (!value) return null;

  const byId = db.prepare('SELECT id FROM users WHERE id = ?').get(value);
  if (byId) return byId.id;

  const byEmail = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(value);
  return byEmail ? byEmail.id : null;
}

function ensureSystemUserForDb(db) {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get('user-system');
  if (existing) return existing.id;

  db.prepare(`
    INSERT INTO users (id, first_name, last_name, email, password_hash, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run('user-system', 'System', '', 'system@travelmate.ai', '$2a$08$system.nohash.placeholder', sqlNow(), sqlNow());

  return 'user-system';
}

function findOrCreateDestinationForDb(db, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;

  const existing = db
    .prepare('SELECT id FROM destinations WHERE lower(name) = lower(?) LIMIT 1')
    .get(trimmed);
  if (existing) return existing.id;

  const id = `dest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = sqlNow();
  db.prepare(`
    INSERT INTO destinations (id, name, location, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, trimmed, trimmed, now, now);

  return id;
}

const SCHEMA_VERSION_3NF = 2;

function hasColumn(db, table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((col) => col.name === column);
}

function dropTriggersReferencing(db, tableName) {
  const triggers = db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND sql IS NOT NULL")
    .all();

  for (const trigger of triggers) {
    if (trigger.sql.includes(tableName)) {
      db.exec(`DROP TRIGGER IF EXISTS ${trigger.name}`);
    }
  }
}

function rebuildTable(db, tableName, createSql, copySql) {
  const backup = `_migrate_${tableName}_old`;
  dropTriggersReferencing(db, tableName);
  if (tableName === 'itinerary_items') {
    dropTriggersReferencing(db, 'trip_plans');
  }
  db.exec(`DROP TABLE IF EXISTS ${backup}`);
  db.exec(`ALTER TABLE ${tableName} RENAME TO ${backup}`);
  db.exec(createSql);
  db.exec(copySql);
  db.exec(`DROP TABLE ${backup}`);
}

function backfillTripPlanUserIds(db) {
  if (!hasColumn(db, 'trip_plans', 'user_email')) return;

  const rows = db
    .prepare('SELECT id, user_email, user_id FROM trip_plans WHERE user_id IS NULL AND user_email IS NOT NULL')
    .all();

  const update = db.prepare('UPDATE trip_plans SET user_id = ? WHERE id = ?');
  for (const row of rows) {
    const userId = resolveUserIdForDb(db, row.user_email);
    if (userId) update.run(userId, row.id);
  }
}

function syncTripPlanItemsFromJson(db) {
  if (!hasColumn(db, 'trip_plans', 'items_json')) return;

  const plans = db.prepare('SELECT id, items_json FROM trip_plans WHERE items_json IS NOT NULL AND trim(items_json) != ?').all('[]');
  const existingCount = db.prepare('SELECT COUNT(*) AS c FROM itinerary_items').get().c;
  if (existingCount > 0) return;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO itinerary_items (id, trip_plan_id, day, title, details, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((rows) => {
    for (const plan of rows) {
      let items = [];
      try {
        items = JSON.parse(plan.items_json);
      } catch {
        items = [];
      }
      if (!Array.isArray(items)) continue;

      items.forEach((item, index) => {
        const day = Number(item.day) || index + 1;
        const title = item.title || `Day ${day}`;
        insert.run(
          item.id || `item-${plan.id}-${day}-${index}`,
          plan.id,
          day,
          title,
          item.details || null,
          index,
          sqlNow(),
          sqlNow()
        );
      });
    }
  });
  tx(plans);
}

function backfillTripPlanDestinationIds(db) {
  if (!hasColumn(db, 'trip_plans', 'destination')) return;

  ensureColumn(db, 'trip_plans', 'destination_id', 'ALTER TABLE trip_plans ADD COLUMN destination_id TEXT');

  const rows = db
    .prepare('SELECT id, destination, destination_id FROM trip_plans WHERE destination_id IS NULL AND destination IS NOT NULL')
    .all();

  const update = db.prepare('UPDATE trip_plans SET destination_id = ? WHERE id = ?');
  for (const row of rows) {
    const destinationId = findOrCreateDestinationForDb(db, row.destination);
    if (destinationId) update.run(destinationId, row.id);
  }
}

function ensureColumn(db, table, column, sql) {
  if (!hasColumn(db, table, column)) {
    db.exec(sql);
  }
}

function hasBrokenMigrationRefs(db) {
  const row = db
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE sql LIKE '%_migrate_%' LIMIT 1")
    .get();
  return Boolean(row);
}

function rebuildItineraryItems(db) {
  if (!hasColumn(db, 'itinerary_items', 'trip_plan_id')) return;

  const fkList = db.prepare('PRAGMA foreign_key_list(itinerary_items)').all();
  const tripPlanFk = fkList.find((fk) => fk.from === 'trip_plan_id');
  if (tripPlanFk && tripPlanFk.table === 'trip_plans') return;

  rebuildTable(
    db,
    'itinerary_items',
    `
    CREATE TABLE itinerary_items (
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
    `,
    `
    INSERT INTO itinerary_items (
      id, trip_plan_id, day, title, details, order_index,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id, trip_plan_id, day, title, details, order_index,
      created_by, updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_itinerary_items_old;
    `
  );
}

function rebuildBookings(db) {
  const fkList = db.prepare('PRAGMA foreign_key_list(bookings)').all();
  const tripPlanFk = fkList.find((fk) => fk.from === 'trip_plan_id');
  if (tripPlanFk && tripPlanFk.table === 'trip_plans') return;

  rebuildTable(
    db,
    'bookings',
    `
    CREATE TABLE bookings (
      id TEXT PRIMARY KEY,
      trip_plan_id TEXT,
      supplier_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      date TEXT NOT NULL,
      amount TEXT DEFAULT '',
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
    `,
    `
    INSERT INTO bookings (
      id, trip_plan_id, supplier_id, type, title, status, date, amount, location, details,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id, trip_plan_id, supplier_id, type, title, status, date, amount, location, details,
      created_by, updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_bookings_old;
    `
  );
}

function rebuildMessagesRoomFk(db) {
  if (!hasColumn(db, 'messages', 'from_user_id')) return;

  const fkList = db.prepare('PRAGMA foreign_key_list(messages)').all();
  const roomFk = fkList.find((fk) => fk.from === 'room');
  if (roomFk && roomFk.table === 'chat_rooms') return;

  rebuildTable(
    db,
    'messages',
    `
    CREATE TABLE messages (
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
    `,
    `
    INSERT INTO messages (id, room, from_user_id, to_user_id, content, created_by, updated_by, created_at, updated_at)
    SELECT id, room, from_user_id, to_user_id, content, created_by, updated_by, created_at, updated_at
    FROM _migrate_messages_old;
    `
  );
}

function dropFtsTriggers(db) {
  const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all();
  for (const trigger of triggers) {
    db.exec(`DROP TRIGGER IF EXISTS ${trigger.name}`);
  }
}

function rebuildInvoices(db) {
  const fkList = db.prepare('PRAGMA foreign_key_list(invoices)').all();
  const bookingOk = fkList.some((fk) => fk.from === 'booking_id' && fk.table === 'bookings');
  const auditOk = fkList.some((fk) => fk.from === 'created_by' && fk.table === 'users');
  if (bookingOk && auditOk) return;

  rebuildTable(
    db,
    'invoices',
    `
    CREATE TABLE invoices (
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
    `,
    `
    INSERT INTO invoices (
      id, user_id, booking_id, amount, currency, issued_at, due_date, status, pdf_path,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id, user_id, booking_id, amount, currency, issued_at, due_date, status, pdf_path,