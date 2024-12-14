const { db } = require('../db');
const { sqlNow } = require('../utils/dateFormat');
const { generateId } = require('../utils/ids');

function listAll() {
  return db.prepare(`
    SELECT
      u.id,
      trim(u.first_name || ' ' || u.last_name) AS name,
      u.first_name,
      u.last_name,
      u.email,
      COALESCE((
        SELECT r.name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id
        ORDER BY CASE r.name WHEN 'admin' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END
        LIMIT 1
      ), 'user') AS role,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    ORDER BY u.created_at DESC
  `).all();
}

function findPublicById(id) {
  return db.prepare(`
    SELECT
      u.id,
      trim(u.first_name || ' ' || u.last_name) AS name,
      u.first_name,
      u.last_name,
      u.email,
      COALESCE((
        SELECT r.name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id
        ORDER BY CASE r.name WHEN 'admin' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END
        LIMIT 1
      ), 'user') AS role,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    WHERE u.id = ?
  `).get(id);
}

function findRawById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function updateProfile(id, { first_name, last_name, is_active }) {
  const updates = [];
  const params = [];
  if (first_name !== undefined) {
    updates.push('first_name = ?');
    params.push(first_name);
  }
  if (last_name !== undefined) {
    updates.push('last_name = ?');
    params.push(last_name);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  if (updates.length === 0) return findRawById(id);
  updates.push('updated_at = ?');
  params.push(sqlNow(), id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return findRawById(id);
}

function setUserRole(userId, roleName) {
  const roleRow = db.prepare('SELECT id FROM roles WHERE name = ?').get(roleName.trim());
  if (!roleRow) return false;
  db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId);
  const now = sqlNow();
  db.prepare(`
    INSERT INTO user_roles (id, user_id, role_id, assigned_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(`ur-${userId}-${roleRow.id}`, userId, roleRow.id, now, now, now);
  return true;
}

function remove(id) {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

module.exports = {
  listAll,
  findPublicById,
  findRawById,
  updateProfile,
  setUserRole,
  remove
};
