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
      created_by, updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_invoices_old;
    `
  );
}

function rebuildPayments(db) {
  const fkList = db.prepare('PRAGMA foreign_key_list(payments)').all();
  const bookingOk = fkList.some((fk) => fk.from === 'booking_id' && fk.table === 'bookings');
  const auditOk = fkList.some((fk) => fk.from === 'created_by' && fk.table === 'users');
  if (bookingOk && auditOk) return;

  rebuildTable(
    db,
    'payments',
    `
    CREATE TABLE payments (
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
    `,
    `
    INSERT INTO payments (
      id, user_id, booking_id, amount, currency, status, method, paid_at,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id, user_id, booking_id, amount, currency, status, method, paid_at,
      created_by, updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_payments_old;
    `
  );
}

function cleanupLegacyColumns(db) {
  if (hasColumn(db, 'trip_plans', 'user_email') || hasColumn(db, 'trip_plans', 'items_json') || hasColumn(db, 'trip_plans', 'destination')) {
    rebuildTable(
      db,
      'trip_plans',
      `
      CREATE TABLE trip_plans (
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
      `,
      `
      INSERT INTO trip_plans (
        id, name, destination_id, days, style, budget, custom_prompt, source,
        user_id, planned_date, created_by, updated_by, created_at, updated_at
      )
      SELECT
        id, name, destination_id, days, style, budget, custom_prompt, source,
        user_id, planned_date, created_by, updated_by, created_at, updated_at
      FROM _migrate_trip_plans_old;
      `
    );
  }

  if (hasColumn(db, 'notifications', 'user_email')) {
    rebuildTable(
      db,
      'notifications',
      `
      CREATE TABLE notifications (
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
      `,
      `
      INSERT INTO notifications (id, type, title, message, user_id, is_read, created_by, updated_by, created_at, updated_at)
      SELECT id, type, title, message, user_id, is_read, created_by, updated_by, created_at, updated_at
      FROM _migrate_notifications_old;
      `
    );
  }
}

function tableExists(db, table) {
  return Boolean(
    db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name = ?").get(table)
  );
}

function tripPlansHasBrokenDestinationFk(db) {
  if (!tableExists(db, 'trip_plans')) return false;
  const fks = db.prepare('PRAGMA foreign_key_list(trip_plans)').all();
  const destFk = fks.find((fk) => fk.from === 'destination_id');
  return Boolean(destFk && destFk.table !== 'destinations');
}

function rebuildTripPlansTable(db) {
  rebuildTable(
    db,
    'trip_plans',
    `
    CREATE TABLE trip_plans (
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
    `,
    `
    INSERT INTO trip_plans (
      id, name, destination_id, days, style, budget, custom_prompt, source,
      user_id, planned_date, created_by, updated_by, created_at, updated_at
    )
    SELECT
      id, name, destination_id, days, style, budget, custom_prompt, source,
      user_id, planned_date, created_by, updated_by, created_at, updated_at
    FROM _migrate_trip_plans_old;
    `
  );
}

function repairDependentTables(db) {
  const steps = [
    { name: 'itinerary_items', check: () => {
      const fks = db.prepare('PRAGMA foreign_key_list(itinerary_items)').all();
      return fks.some((fk) => fk.from === 'trip_plan_id' && fk.table !== 'trip_plans');
    }, run: () => rebuildItineraryItems(db) },
    { name: 'bookings', check: () => {
      const fks = db.prepare('PRAGMA foreign_key_list(bookings)').all();
      return fks.some((fk) => fk.from === 'trip_plan_id' && fk.table !== 'trip_plans');
    }, run: () => rebuildBookings(db) },
    { name: 'messages', check: () => {
      const fks = db.prepare('PRAGMA foreign_key_list(messages)').all();
      return fks.some((fk) => fk.from === 'room' && fk.table !== 'chat_rooms');
    }, run: () => rebuildMessagesRoomFk(db) },
    { name: 'invoices', check: () => {
      const fks = db.prepare('PRAGMA foreign_key_list(invoices)').all();
      return fks.some((fk) => fk.from === 'booking_id' && fk.table !== 'bookings');
    }, run: () => rebuildInvoices(db) },
    { name: 'payments', check: () => {
      const fks = db.prepare('PRAGMA foreign_key_list(payments)').all();
      return fks.some((fk) => fk.from === 'booking_id' && fk.table !== 'bookings');
    }, run: () => rebuildPayments(db) }
  ];

  let repaired = false;
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    for (const step of steps) {
      if (step.check()) {
        step.run();
        changed = true;
        repaired = true;
      }
    }
    if (!changed) break;
  }
  return repaired;
}

function repairBrokenForeignKeys(db) {
  dropFtsTriggers(db);

  const needsLegacyCleanup =
    hasColumn(db, 'trip_plans', 'user_email') ||
    hasColumn(db, 'trip_plans', 'items_json') ||
    hasColumn(db, 'trip_plans', 'destination') ||
    hasColumn(db, 'notifications', 'user_email');

  const hasBrokenRefs = Boolean(
    db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND sql LIKE '%_migrate_%' LIMIT 1").get()
  );

  if (!needsLegacyCleanup && !hasBrokenRefs) {
    return;
  }

  console.log('[db] repairing 3NF schema (foreign keys / legacy columns)');

  if (tripPlansHasBrokenDestinationFk(db)) {
    rebuildTripPlansTable(db);
  }

  if (needsLegacyCleanup) cleanupLegacyColumns(db);
  repairDependentTables(db);
}

function migrateMessages(db) {
  if (hasColumn(db, 'messages', 'from_user_id')) return;

  ensureSystemUserForDb(db);
  ensureColumn(db, 'messages', 'from_user_id', 'ALTER TABLE messages ADD COLUMN from_user_id TEXT');
  ensureColumn(db, 'messages', 'to_user_id', 'ALTER TABLE messages ADD COLUMN to_user_id TEXT');

  const rows = db.prepare('SELECT id, from_user, to_user FROM messages').all();
  const update = db.prepare('UPDATE messages SET from_user_id = ?, to_user_id = ? WHERE id = ?');
  for (const row of rows) {
    const fromId = resolveUserIdForDb(db, row.from_user) || ensureSystemUserForDb(db);
    const toId = row.to_user ? resolveUserIdForDb(db, row.to_user) : null;
    update.run(fromId, toId, row.id);
  }

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

function migrateTripPlans(db) {
  if (
    !hasColumn(db, 'trip_plans', 'user_email') &&
    !hasColumn(db, 'trip_plans', 'items_json') &&
    !hasColumn(db, 'trip_plans', 'destination')
  ) {
    return;
  }

  backfillTripPlanUserIds(db);
  syncTripPlanItemsFromJson(db);
  backfillTripPlanDestinationIds(db);

  rebuildTable(
    db,
    'trip_plans',
    `
    CREATE TABLE trip_plans (
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
    `,
    `
    INSERT INTO trip_plans (
      id, name, destination_id, days, style, budget, custom_prompt, source,
      user_id, planned_date, created_by, updated_by, created_at, updated_at
    )
    SELECT
      id,
      name,
      destination_id,
      days,
      style,
      budget,
      custom_prompt,
      source,
      user_id,
      planned_date,
      created_by,
      updated_by,
      created_at,
      updated_at
    FROM _migrate_trip_plans_old;
    `
  );
}

function migrateNotifications(db) {
  if (!hasColumn(db, 'notifications', 'user_email')) return;

  const rows = db
    .prepare('SELECT id, user_email, user_id FROM notifications WHERE user_id IS NULL AND user_email IS NOT NULL')
    .all();
  const update = db.prepare('UPDATE notifications SET user_id = ? WHERE id = ?');
  for (const row of rows) {
    const userId = resolveUserIdForDb(db, row.user_email);
    if (userId) update.run(userId, row.id);
  }

  rebuildTable(
    db,
    'notifications',
    `
    CREATE TABLE notifications (
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
    `,
    `
    INSERT INTO notifications (id, type, title, message, user_id, is_read, created_by, updated_by, created_at, updated_at)
    SELECT id, type, title, message, user_id, is_read, created_by, updated_by, created_at, updated_at
    FROM _migrate_notifications_old;
    `
  );
}

function migrateChatRooms(db) {
  const fkList = db.prepare('PRAGMA foreign_key_list(chat_rooms)').all();
  if (fkList.some((fk) => fk.from === 'created_by')) return;

  rebuildTable(
    db,
    'chat_rooms',
    `
    CREATE TABLE chat_rooms (
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
    `,
    `
    INSERT INTO chat_rooms (id, name, description, is_private, created_by, updated_by, created_at, updated_at)
    SELECT id, name, description, is_private, created_by, updated_by, created_at, updated_at
    FROM _migrate_chat_rooms_old;
    `
  );
}

function ensureIndexes(db) {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_users_updated_by ON users(updated_by)',
    'CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id)',
    'CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)',
    'CREATE INDEX IF NOT EXISTS idx_trip_plans_user_id ON trip_plans(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_trip_plans_destination_id ON trip_plans(destination_id)',
    'CREATE INDEX IF NOT EXISTS idx_itinerary_items_trip_plan_id ON itinerary_items(trip_plan_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_trip_plan_id ON bookings(trip_plan_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_supplier_id ON bookings(supplier_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id)',
    'CREATE INDEX IF NOT EXISTS idx_travel_groups_owner_id ON travel_groups(owner_id)',
    'CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(travel_group_id)',
    'CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room)',
    'CREATE INDEX IF NOT EXISTS idx_messages_from_user_id ON messages(from_user_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_to_user_id ON messages(to_user_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_reviews_entity ON reviews(entity, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_favorites_entity ON favorites(entity, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by)'
  ];

  for (const sql of indexes) {
    db.exec(sql);
  }

  db.exec('DROP INDEX IF EXISTS idx_trip_plans_user_email');
  db.exec('DROP INDEX IF EXISTS idx_notifications_user_email');
  db.exec('DROP INDEX IF EXISTS idx_messages_from_user');
  db.exec('DROP INDEX IF EXISTS idx_messages_to_user');
  db.exec('DROP INDEX IF EXISTS idx_trip_plan_items_trip_plan_id');
}

function migrateTo3NF(db) {
  db.pragma('foreign_keys = OFF');
  try {
    const version = db.pragma('user_version', { simple: true });

    if (version < SCHEMA_VERSION_3NF) {
      migrateChatRooms(db);
      migrateMessages(db);
      migrateTripPlans(db);
      migrateNotifications(db);
      db.pragma(`user_version = ${SCHEMA_VERSION_3NF}`);
      console.log('[db] schema migrated to 3NF (user_version=2)');
    }

    repairBrokenForeignKeys(db);
    ensureIndexes(db);
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

module.exports = {
  migrateTo3NF,
  repairBrokenForeignKeys,
  rebuildInvoices,
  rebuildPayments,
  SCHEMA_VERSION_3NF
};
