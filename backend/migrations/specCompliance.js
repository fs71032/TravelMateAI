const { sqlNow } = require('../utils/dateFormat');

const SCHEMA_VERSION_SPEC = 3;

const AUDIT_FK = `
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
`;

function hasColumn(db, table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((col) => col.name === column);
}

function tableExists(db, table) {
  return Boolean(
    db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name = ?").get(table)
  );
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
  db.exec(`DROP TABLE IF EXISTS ${backup}`);
  db.exec(`ALTER TABLE ${tableName} RENAME TO ${backup}`);
  db.exec(createSql);
  db.exec(copySql);
  db.exec(`DROP TABLE ${backup}`);
}

function ensureDefaultRoles(db) {
  const roles = [
    { id: 'role-admin', name: 'admin', description: 'Administrator with full access' },
    { id: 'role-user', name: 'user', description: 'Standard application user' },
    { id: 'role-manager', name: 'manager', description: 'Manager with elevated permissions' }
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO roles (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const now = sqlNow();
  for (const role of roles) {
    insert.run(role.id, role.name, role.description, now, now);
  }
}

function backfillUserRolesFromLegacyRole(db) {
  if (!hasColumn(db, 'users', 'role')) return;

  ensureDefaultRoles(db);

  const users = db.prepare('SELECT id, role FROM users').all();
  const roleByName = db.prepare('SELECT id FROM roles WHERE name = ?');
  const insert = db.prepare(`
    INSERT OR IGNORE INTO user_roles (id, user_id, role_id, assigned_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = sqlNow();
  for (const user of users) {
    const roleName = (user.role || 'user').trim().toLowerCase();
    let roleRow = roleByName.get(roleName);
    if (!roleRow && roleName === 'system') {
      roleRow = roleByName.get('user');
    }
    if (!roleRow) {
      const roleId = `role-${roleName}-${Date.now()}`;
      db.prepare('INSERT OR IGNORE INTO roles (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        roleId,
        roleName,
        `Legacy role: ${roleName}`,
        now,
        now
      );
      roleRow = { id: roleId };
    }
    insert.run(`ur-${user.id}-${roleRow.id}`, user.id, roleRow.id, now, now, now);
  }
}

function repairPartialUserMigration(db) {
  if (!tableExists(db, '_migrate_users_old')) return;

  db.exec('DROP TABLE IF EXISTS users');
  db.exec('ALTER TABLE _migrate_users_old RENAME TO users');
  console.log('[db] repaired partial users migration rollback');
}

function migrateUsersTable(db) {
  if (!tableExists(db, 'users')) return;
  if (hasColumn(db, 'users', 'first_name') && !hasColumn(db, 'users', 'role')) return;

  repairPartialUserMigration(db);
  backfillUserRolesFromLegacyRole(db);

  rebuildTable(
    db,
    'users',
    `
    CREATE TABLE users (
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
      ${AUDIT_FK.trim()}
    );
    `,
    `
    INSERT INTO users (
      id, first_name, last_name, email, password_hash, is_active,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id,
      CASE
        WHEN instr(COALESCE(name, ''), ' ') > 0 THEN trim(substr(name, 1, instr(name, ' ') - 1))
        ELSE COALESCE(name, 'User')
      END,
      CASE
        WHEN instr(COALESCE(name, ''), ' ') > 0 THEN trim(substr(name, instr(name, ' ') + 1))
        ELSE ''
      END,
      email,
      COALESCE(password, ''),
      COALESCE(is_active, 1),
      created_by,
      updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_users_old;
    `
  );
}

function migrateRefreshTokens(db) {
  if (!tableExists(db, 'refresh_tokens')) return;
  if (hasColumn(db, 'refresh_tokens', 'token_hash') && !hasColumn(db, 'refresh_tokens', 'token')) return;

  rebuildTable(
    db,
    'refresh_tokens',
    `
    CREATE TABLE refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      ${AUDIT_FK.trim()}
    );
    `,
    `
    INSERT INTO refresh_tokens (
      id, user_id, token_hash, expires_at, revoked_at,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id,
      user_id,
      COALESCE(token_hash, token),
      expires_at,
      revoked_at,
      created_by,
      updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_refresh_tokens_old;
    `
  );
}

function migrateAuditLogs(db) {
  if (!tableExists(db, 'audit_logs')) return;
  if (hasColumn(db, 'audit_logs', 'entity') && !hasColumn(db, 'audit_logs', 'table_name')) return;

  rebuildTable(
    db,
    'audit_logs',
    `
    CREATE TABLE audit_logs (
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
      ${AUDIT_FK.trim()}
    );
    `,
    `
    INSERT INTO audit_logs (
      id, user_id, action, entity, entity_id, old_value, new_value, ip_address,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id,
      user_id,
      action,
      COALESCE(entity, table_name),
      COALESCE(entity_id, record_id),
      old_value,
      COALESCE(new_value, details),
      ip_address,
      created_by,
      updated_by,
      COALESCE(created_at, changed_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, created_at, changed_at, CURRENT_TIMESTAMP)
    FROM _migrate_audit_logs_old;
    `
  );
}

function migrateFiles(db) {
  if (!tableExists(db, 'files')) return;
  if (hasColumn(db, 'files', 'entity') && !hasColumn(db, 'files', 'related_table')) return;

  rebuildTable(
    db,
    'files',
    `
    CREATE TABLE files (
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
      ${AUDIT_FK.trim()}
    );
    `,
    `
    INSERT INTO files (
      id, entity, entity_id, filename, file_path, file_size, mime_type, uploaded_by,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id,
      COALESCE(entity, related_table),
      COALESCE(entity_id, related_id),
      filename,
      COALESCE(file_path, url, ''),
      file_size,
      mime_type,
      COALESCE(uploaded_by, created_by),
      created_by,
      updated_by,
      COALESCE(created_at, uploaded_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, created_at, uploaded_at, CURRENT_TIMESTAMP)
    FROM _migrate_files_old;
    `
  );
}

function migrateReviews(db) {
  if (!tableExists(db, 'reviews')) return;
  if (hasColumn(db, 'reviews', 'entity') && !hasColumn(db, 'reviews', 'target_table')) return;

  rebuildTable(
    db,
    'reviews',
    `
    CREATE TABLE reviews (
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
      ${AUDIT_FK.trim()}
    );
    `,
    `
    INSERT INTO reviews (
      id, entity, entity_id, user_id, rating, comment,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id,
      COALESCE(entity, target_table),
      COALESCE(entity_id, target_id),
      user_id,
      rating,
      comment,
      created_by,
      updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_reviews_old;
    `
  );
}

function migrateFavorites(db) {
  if (!tableExists(db, 'favorites')) return;
  if (hasColumn(db, 'favorites', 'entity') && !hasColumn(db, 'favorites', 'target_table')) return;

  rebuildTable(
    db,
    'favorites',
    `
    CREATE TABLE favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      ${AUDIT_FK.trim()}
    );
    `,
    `
    INSERT INTO favorites (
      id, user_id, entity, entity_id,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id,
      user_id,
      COALESCE(entity, target_table),
      COALESCE(entity_id, target_id),
      created_by,
      updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_favorites_old;
    `
  );
}

function migrateSettings(db) {
  if (!tableExists(db, 'settings')) return;
  if (!hasColumn(db, 'settings', 'description')) {
    db.exec('ALTER TABLE settings ADD COLUMN description TEXT');
  }

  const fkList = db.prepare('PRAGMA foreign_key_list(settings)').all();
  const hasAuditFk = fkList.some((fk) => fk.from === 'created_by');
  if (hasAuditFk) return;

  rebuildTable(
    db,
    'settings',
    `
    CREATE TABLE settings (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      key TEXT NOT NULL,
      value TEXT,
      description TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      ${AUDIT_FK.trim()},
      UNIQUE(user_id, key)
    );
    `,
    `
    INSERT INTO settings (
      id, user_id, key, value, description,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id, user_id, key, value, description,
      created_by, updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_settings_old;
    `
  );
}

function migrateBookingsAmount(db) {
  if (!tableExists(db, 'bookings')) return;

  const amountCol = db.prepare('PRAGMA table_info(bookings)').all().find((c) => c.name === 'amount');
  if (!amountCol || amountCol.type.toUpperCase() === 'REAL') return;

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
      amount REAL DEFAULT 0,
      location TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(trip_plan_id) REFERENCES trip_plans(id) ON DELETE SET NULL,
      FOREIGN KEY(supplier_id) REFERENCES booking_suppliers(id) ON DELETE SET NULL,
      ${AUDIT_FK.trim()}
    );
    `,
    `
    INSERT INTO bookings (
      id, trip_plan_id, supplier_id, type, title, status, date, amount, location, details,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id, trip_plan_id, supplier_id, type, title, status, date,
      CASE
        WHEN amount IS NULL OR trim(amount) = '' THEN 0
        ELSE CAST(amount AS REAL)
      END,
      location, details,
      created_by, updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_bookings_old;
    `
  );
}

function rebuildWithAuditFks(db, tableName, bodySql, selectSql) {
  if (!tableExists(db, tableName)) return;

  const fkList = db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
  const hasCreatedByFk = fkList.some((fk) => fk.from === 'created_by' && fk.table === 'users');
  if (hasCreatedByFk) return;

  rebuildTable(
    db,
    tableName,
    `CREATE TABLE ${tableName} (${bodySql});`,
    `INSERT INTO ${tableName} SELECT ${selectSql} FROM _migrate_${tableName}_old;`
  );
}

function migrateAuditForeignKeys(db) {
  const tables = [
    {
      name: 'roles',
      body: `
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ${AUDIT_FK.trim()}
      `,
      select: 'id, name, description, created_by, updated_by, created_at, updated_at'
    },
    {
      name: 'permissions',
      body: `
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ${AUDIT_FK.trim()}
      `,
      select: 'id, name, description, created_by, updated_by, created_at, updated_at'
    },
    {
      name: 'destinations',
      body: `
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
        ${AUDIT_FK.trim()}
      `,
      select: 'id, name, location, category, price, rating, description, created_by, updated_by, created_at, updated_at'
    },
    {
      name: 'guides',
      body: `
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
        ${AUDIT_FK.trim()}
      `,
      select: 'id, name, language, specialty, contact, rating, bio, created_by, updated_by, created_at, updated_at'
    },
    {
      name: 'booking_suppliers',
      body: `
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
        ${AUDIT_FK.trim()}
      `,
      select: 'id, name, type, contact, phone, email, details, created_by, updated_by, created_at, updated_at'
    },
    {
      name: 'travel_groups',
      body: `
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        owner_id TEXT NOT NULL,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE,
        ${AUDIT_FK.trim()}
      `,
      select: 'id, name, description, owner_id, created_by, updated_by, created_at, updated_at'
    },
    {
      name: 'group_members',
      body: `
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
        ${AUDIT_FK.trim()},
        UNIQUE(travel_group_id, user_id)
      `,
      select: 'id, travel_group_id, user_id, role, created_by, updated_by, joined_at, created_at, updated_at'
    },
    {
      name: 'role_permissions',
      body: `
        id TEXT PRIMARY KEY,
        role_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        ${AUDIT_FK.trim()},
        UNIQUE(role_id, permission_id)
      `,
      select: 'id, role_id, permission_id, created_by, updated_by, created_at, updated_at'
    },
    {
      name: 'user_roles',
      body: `
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
        ${AUDIT_FK.trim()},
        UNIQUE(user_id, role_id)
      `,
      select: 'id, user_id, role_id, assigned_at, created_by, updated_by, created_at, updated_at'
    },
    {
      name: 'invoices',
      body: `
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
        ${AUDIT_FK.trim()}
      `,
      select: 'id, user_id, booking_id, amount, currency, issued_at, due_date, status, pdf_path, created_by, updated_by, created_at, updated_at'
    },
    {
      name: 'payments',
      body: `
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
        ${AUDIT_FK.trim()}
      `,
      select: 'id, user_id, booking_id, amount, currency, status, method, paid_at, created_by, updated_by, created_at, updated_at'
    }
  ];

  for (const table of tables) {
    rebuildWithAuditFks(db, table.name, table.body, table.select);
  }
}

function repairInvoicesPaymentsAuditFk(db) {
  const { rebuildInvoices, rebuildPayments } = require('./to3nf');
  rebuildInvoices(db);
  rebuildPayments(db);
}

function repairDestinationsAuditFk(db) {
  if (!tableExists(db, 'destinations') && tableExists(db, '_migrate_destinations_old')) {
    db.exec('ALTER TABLE _migrate_destinations_old RENAME TO destinations');
  }
  db.exec('DROP TABLE IF EXISTS _migrate_destinations_old');

  if (!tableExists(db, 'destinations')) return;

  const fkList = db.prepare('PRAGMA foreign_key_list(destinations)').all();
  if (fkList.some((fk) => fk.from === 'created_by' && fk.table === 'users')) return;

  rebuildTable(
    db,
    'destinations',
    `
    CREATE TABLE destinations (
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
      ${AUDIT_FK.trim()}
    );
    `,
    `
    INSERT INTO destinations (
      id, name, location, category, price, rating, description,
      created_by, updated_by, created_at, updated_at
    )
    SELECT
      id, name, location, category, price, rating, description,
      created_by, updated_by,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _migrate_destinations_old;
    `
  );
}

function ensureSpecIndexes(db) {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_users_updated_by ON users(updated_by)',
    'CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)',
    'CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name)',
    'CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash)',
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
    'CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name)',
    'CREATE INDEX IF NOT EXISTS idx_destinations_location ON destinations(location)',
    'CREATE INDEX IF NOT EXISTS idx_guides_name ON guides(name)',
    'CREATE INDEX IF NOT EXISTS idx_booking_suppliers_name ON booking_suppliers(name)',
    'CREATE INDEX IF NOT EXISTS idx_booking_suppliers_type ON booking_suppliers(type)'
  ];

  for (const sql of indexes) {
    db.exec(sql);
  }

  db.exec('DROP INDEX IF EXISTS idx_reviews_target');
  db.exec('DROP INDEX IF EXISTS idx_favorites_target');
  db.exec('DROP INDEX IF EXISTS idx_files_related');
}

function migrateToSpec(db) {
  db.pragma('foreign_keys = OFF');
  try {
    repairPartialUserMigration(db);

    const version = db.pragma('user_version', { simple: true });

    if (version < SCHEMA_VERSION_SPEC) {
      console.log('[db] migrating schema to spec compliance (user_version=3)');
      ensureDefaultRoles(db);
      migrateUsersTable(db);
      migrateRefreshTokens(db);
      migrateAuditLogs(db);
      migrateFiles(db);
      migrateReviews(db);
      migrateFavorites(db);
      migrateSettings(db);
      migrateBookingsAmount(db);
      migrateAuditForeignKeys(db);

      const { repairBrokenForeignKeys } = require('./to3nf');
      repairBrokenForeignKeys(db);

      db.pragma(`user_version = ${SCHEMA_VERSION_SPEC}`);
      console.log('[db] schema migrated to spec compliance (user_version=3)');
    }

    repairInvoicesPaymentsAuditFk(db);
    repairDestinationsAuditFk(db);
    ensureSpecIndexes(db);
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

module.exports = { migrateToSpec, SCHEMA_VERSION_SPEC };
