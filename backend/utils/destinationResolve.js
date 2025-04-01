const { sqlNow } = require('./dateFormat');

function getDb() {
  return require('../db').db;
}

function findOrCreateDestination(name, actorUserId = null) {
  const db = getDb();
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;

  const existing = db
    .prepare('SELECT id FROM destinations WHERE lower(name) = lower(?) LIMIT 1')
    .get(trimmed);
  if (existing) return existing.id;

  const id = `dest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = sqlNow();
  db.prepare(`
    INSERT INTO destinations (id, name, location, created_by, updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, trimmed, trimmed, actorUserId, actorUserId, now, now);

  return id;
}

function getDestinationName(destinationId) {
  if (!destinationId) return '';
  const db = getDb();
  const row = db.prepare('SELECT name FROM destinations WHERE id = ?').get(destinationId);
  return row ? row.name : '';
}

module.exports = { findOrCreateDestination, getDestinationName };
