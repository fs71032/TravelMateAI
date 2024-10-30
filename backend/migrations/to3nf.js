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