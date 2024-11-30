const crypto = require('crypto');
const { db } = require('../db');
const { sqlNow, addDays } = require('../utils/dateFormat');
const { generateId } = require('../utils/ids');
const { hashRefreshToken } = require('../utils/tokenHash');

function createPlainToken() {
  return crypto.randomBytes(32).toString('hex');
}

function create(userId) {
  const id = generateId('refresh');
  const plainToken = createPlainToken();
  const tokenHash = hashRefreshToken(plainToken);
  const expiresAt = addDays(30);
  const now = sqlNow();
  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, tokenHash, expiresAt, now, now);
  return { id, token: plainToken, expiresAt };
}

function findValidByPlainToken(plainToken) {
  if (!plainToken) return null;
  const hashed = hashRefreshToken(plainToken);
  let row = db.prepare(`
    SELECT * FROM refresh_tokens
    WHERE token_hash = ? AND revoked_at IS NULL
  `).get(hashed);
  if (!row) {
    row = db.prepare(`
      SELECT * FROM refresh_tokens
      WHERE token_hash = ? AND revoked_at IS NULL
    `).get(plainToken);
  }
  return row || null;
}

function listAll() {
  return db.prepare(`
    SELECT id, user_id, expires_at, revoked_at,
      CASE WHEN length(token_hash) > 12 THEN substr(token_hash, 1, 12) || '…' ELSE token_hash END AS token_preview
    FROM refresh_tokens
    ORDER BY expires_at DESC
  `).all();
}

function revoke(id) {
  return db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = ?, updated_at = ?
    WHERE id = ? AND revoked_at IS NULL
  `).run(sqlNow(), sqlNow(), id);
}

module.exports = { create, findValidByPlainToken, listAll, revoke };
