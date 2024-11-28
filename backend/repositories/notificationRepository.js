const { db } = require('../db');
const { normalizeTimestamp } = require('../utils/dateFormat');
const { resolveUserId, resolveUserEmail } = require('../utils/userResolve');

function rowToNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    userEmail: resolveUserEmail(row.user_id) || undefined,
    userId: row.user_id || undefined,
    isRead: Boolean(row.is_read),
    createdBy: row.created_by || undefined,
    updatedBy: row.updated_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}

function listNotifications(userEmail) {
  const userId = resolveUserId(userEmail);
  const rows = userId
    ? db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY datetime(created_at) DESC').all(userId)
    : db.prepare('SELECT * FROM notifications ORDER BY datetime(created_at) DESC').all();
  return rows.map(rowToNotification);
}

function createNotification(notification) {
  const userId = notification.userId || resolveUserId(notification.userEmail);
  const now = normalizeTimestamp(notification.createdAt);

  const record = {
    id: notification.id || `note-${Date.now()}`,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    user_id: userId,
    is_read: notification.isRead ? 1 : 0,
    created_at: now,
    created_by: notification.createdBy || userId,
    updated_by: notification.updatedBy || notification.createdBy || userId,
    updated_at: normalizeTimestamp(notification.updatedAt || notification.createdAt)
  };

  db.prepare(`
    INSERT INTO notifications (
      id,
      type,
      title,
      message,
      user_id,
      is_read,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @type,
      @title,
      @message,
      @user_id,
      @is_read,
      @created_by,
      @updated_by,
      @created_at,
      @updated_at
    )
  `).run(record);

  return rowToNotification(record);
}

module.exports = {
  listNotifications,
  createNotification
};
