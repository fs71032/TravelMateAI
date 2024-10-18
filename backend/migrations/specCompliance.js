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