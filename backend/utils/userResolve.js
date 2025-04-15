function getDb() {
  return require('../db').db;
}

function resolveUserId(emailOrId) {
  const db = getDb();
  if (!emailOrId || typeof emailOrId !== 'string') return null;
  const value = emailOrId.trim();
  if (!value) return null;

  const byId = db.prepare('SELECT id FROM users WHERE id = ?').get(value);
  if (byId) return byId.id;

  const byEmail = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(value);
  return byEmail ? byEmail.id : null;
}

function resolveUserEmail(userId) {
  if (!userId) return null;
  const db = getDb();
  const row = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
  return row ? row.email : null;
}

function ensureSystemUser() {
  const db = getDb();
  const { sqlNow } = require('./dateFormat');
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get('user-system');
  if (existing) return existing.id;

  const now = sqlNow();
  db.prepare(`
    INSERT INTO users (id, first_name, last_name, email, password_hash, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run('user-system', 'System', '', 'system@travelmate.ai', '$2a$08$system.nohash.placeholder', now, now);

  return 'user-system';
}

module.exports = { resolveUserId, resolveUserEmail, ensureSystemUser };
