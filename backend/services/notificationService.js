const notificationRepository = require('../repositories/notificationRepository');
const { emitNotification } = require('../utils/socketEmitter');

function list(userEmail) {
  return { data: notificationRepository.listNotifications(typeof userEmail === 'string' ? userEmail : undefined) };
}

function create(body, actorUserId) {
  const { type, title, message, userEmail } = body || {};
  if (!type || !title || !message) {
    return { error: { status: 400, message: 'Notification type, title, and message are required.' } };
  }
  const notification = notificationRepository.createNotification({
    type,
    title,
    message,
    userEmail: userEmail || null,
    createdBy: actorUserId,
    updatedBy: actorUserId
  });
  emitNotification(notification);
  return { data: notification, status: 201 };
}

module.exports = { list, create };
