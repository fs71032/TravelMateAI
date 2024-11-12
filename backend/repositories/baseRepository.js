const { db } = require('../db');

function findAll(table, { orderBy = 'id', limit } = {}) {
  const sql = limit
    ? `SELECT * FROM ${table} ORDER BY ${orderBy} LIMIT ?`
    : `SELECT * FROM ${table} ORDER BY ${orderBy}`;
  return limit ? db.prepare(sql).all(limit) : db.prepare(sql).all();
}

function findById(table, id) {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

function findWhere(table, whereClause, params, orderBy = 'id') {
  return db.prepare(`SELECT * FROM ${table} WHERE ${whereClause} ORDER BY ${orderBy}`).all(...params);
}

function insertRow(table, columns, values) {
  const placeholders = columns.map(() => '?').join(', ');
  db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).run(...values);
  return findById(table, values[0]);
}

function updateRow(table, id, setClause, params) {
  db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...params, id);
  return findById(table, id);
}

function deleteById(table, id) {
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

function runQuery(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function runGet(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function runExec(sql, params = []) {
  return db.prepare(sql).run(...params);
}

module.exports = {
  findAll,
  findById,
  findWhere,
  insertRow,
  updateRow,
  deleteById,
  runQuery,
  runGet,
  runExec
};
