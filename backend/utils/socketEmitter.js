const { normalizeEmail } = require('./email');

let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

function emitNotification(notification) {
  if (!notification || !ioInstance) return;

  if (notification.userEmail) {
    ioInstance.to(`user:${normalizeEmail(notification.userEmail)}`).emit('notification', notification);
  } else {
    ioInstance.to('global').emit('notification', notification);
  }
}

module.exports = { setIo, emitNotification };
