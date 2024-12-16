const bcrypt = require('bcryptjs');
const { sqlNow } = require('../utils/dateFormat');

function getDb() {
  return require('../db').db;
}

function splitName(fullName) {
  const trimmed = String(fullName || '').trim();
  if (!trimmed) {
    return { first_name: 'User', last_name: '' };
  }

  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return { first_name: trimmed, last_name: '' };
  }

  return {
    first_name: trimmed.slice(0, spaceIndex),
    last_name: trimmed.slice(spaceIndex + 1).trim()
  };
}

function formatDisplayName(row) {
  if (!row) return '';
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
}

function getPrimaryRoleName(userId) {
  if (!userId) return 'user';

  const row = getDb().prepare(`
    SELECT r.name
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY
      CASE r.name
        WHEN 'admin' THEN 0
        WHEN 'manager' THEN 1
        WHEN 'user' THEN 2
        ELSE 3
      END,
      r.name
    LIMIT 1
  `).get(userId);

  return row ? row.name : 'user';
}

function ensureRoleExists(roleName) {
  const normalized = String(roleName || 'user').trim().toLowerCase() || 'user';
  const existing = getDb().prepare('SELECT id FROM roles WHERE name = ?').get(normalized);
  if (existing) return existing.id;

  const id = `role-${normalized}`;
  const now = sqlNow();
  getDb().prepare(`
    INSERT OR IGNORE INTO roles (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, normalized, `Role: ${normalized}`, now, now);

  return id;
}

function assignUserRole(userId, roleName) {
  const roleId = ensureRoleExists(roleName);
  const now = sqlNow();
  getDb().prepare(`
    INSERT OR IGNORE INTO user_roles (id, user_id, role_id, assigned_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(`ur-${userId}-${roleId}`, userId, roleId, now, now, now);
}

function enrichUser(row) {
  if (!row) return null;
  return {
    ...row,
    name: formatDisplayName(row),
    role: getPrimaryRoleName(row.id)
  };
}

function rowToPublicUser(row) {
  const user = enrichUser(row);
  return {
    id: user.id,
    name: user.name,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role
  };
}

function findByEmail(email) {
  const row = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  return enrichUser(row);
}