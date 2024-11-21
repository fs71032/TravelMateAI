const { db } = require('../db');
const { sqlNow } = require('../utils/dateFormat');
const { generateId } = require('../utils/ids');

const ALLOWED_TABLES = new Set([
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'settings',
  'chat_rooms',
  'guides',
  'travel_groups',
  'group_members',
  'booking_suppliers',
  'invoices',
  'payments',
  'files',
  'reviews',
  'favorites',
  'notifications',
  'trip_plans'
]);

function assertTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Table not allowed: ${table}`);
  }
}

function sanitizeOrderBy(orderBy) {
  const value = String(orderBy || 'id').trim();
  if (!/^[a-zA-Z0-9_.,\s]+(?:\s+(?:ASC|DESC))?$/i.test(value)) {
    return 'id';
  }
  return value;
}

function list(table, orderBy = 'id') {
  assertTable(table);
  const safeOrder = sanitizeOrderBy(orderBy);
  return db.prepare(`SELECT * FROM ${table} ORDER BY ${safeOrder}`).all();
}

function listWhere(table, whereSql, params, orderBy = 'id') {
  assertTable(table);
  const safeOrder = sanitizeOrderBy(orderBy);
  return db.prepare(`SELECT * FROM ${table} WHERE ${whereSql} ORDER BY ${safeOrder}`).all(...params);
}

function findById(table, id) {
  assertTable(table);
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

function insert(table, columns, values) {
  assertTable(table);
  const placeholders = columns.map(() => '?').join(', ');
  db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).run(...values);
  return findById(table, values[0]);
}

function updateFields(table, id, setPairs) {
  assertTable(table);
  if (!setPairs.length) return findById(table, id);
  const clause = setPairs.map(([col]) => `${col} = ?`).join(', ');
  const params = setPairs.map(([, val]) => val);
  params.push(id);
  db.prepare(`UPDATE ${table} SET ${clause} WHERE id = ?`).run(...params);
  return findById(table, id);
}

function remove(table, id) {
  assertTable(table);
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

function insertSimple(table, idPrefix, fieldMap) {
  const id = generateId(idPrefix);
  const columns = ['id', ...Object.keys(fieldMap)];
  const values = [id, ...Object.values(fieldMap)];
  return insert(table, columns, values);
}

function updateWithTimestamp(table, id, setPairs) {
  setPairs.push(['updated_at', sqlNow()]);
  return updateFields(table, id, setPairs);
}

module.exports = {
  ALLOWED_TABLES,
  list,
  listWhere,
  findById,
  insert,
  insertSimple,
  updateFields,
  updateWithTimestamp,
  remove
};
