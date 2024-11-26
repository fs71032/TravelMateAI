const { db } = require('../db');
const { normalizeTimestamp, sqlNow } = require('../utils/dateFormat');
const { resolveUserId, resolveUserEmail, ensureSystemUser } = require('../utils/userResolve');

function rowToMessage(row) {
  return {
    id: row.id,
    from: resolveUserEmail(row.from_user_id) || row.from_user_id,
    to: row.to_user_id ? resolveUserEmail(row.to_user_id) : null,
    room: row.room,
    content: row.content,
    time: row.created_at
  };
}

function resolveSenderId(from) {
  if (!from) return ensureSystemUser();
  return resolveUserId(from) || ensureSystemUser();
}

function insertMessage({ id, from, to, room, content, time, createdBy, updatedBy }) {
  const fromUserId = resolveSenderId(from);
  const toUserId = to ? resolveUserId(to) : null;
  const now = normalizeTimestamp(time) || sqlNow();

  const msg = {
    id: id || `m-${Date.now()}`,
    room: room || 'global',
    from_user_id: fromUserId,
    to_user_id: toUserId,
    content,
    created_by: createdBy || fromUserId,
    updated_by: updatedBy || fromUserId,
    created_at: now,
    updated_at: now
  };

  db.prepare(`
    INSERT INTO messages (id, room, from_user_id, to_user_id, content, created_by, updated_by, created_at, updated_at)
    VALUES (@id, @room, @from_user_id, @to_user_id, @content, @created_by, @updated_by, @created_at, @updated_at)
  `).run(msg);

  return rowToMessage(msg);
}

function listMessages({ room = 'global', user, limit = 200 }) {
  let rows;

  if (user) {
    const userId = resolveUserId(user);
    if (!userId) return [];

    rows = db
      .prepare(
        `
        SELECT * FROM messages
        WHERE room = ? AND (from_user_id = ? OR to_user_id = ?)
        ORDER BY datetime(created_at) ASC
        LIMIT ?
      `
      )
      .all(room, userId, userId, limit);
  } else {
    rows = db
      .prepare(
        `
        SELECT * FROM messages
        WHERE room = ?
        ORDER BY datetime(created_at) ASC
        LIMIT ?
      `
      )
      .all(room, limit);
  }

  return rows.map(rowToMessage);
}

module.exports = { insertMessage, listMessages };
