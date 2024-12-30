const messageRepository = require('../repositories/messageRepository');

function getHistory({ room, user }) {
  return { data: messageRepository.listMessages({ room: room || 'global', user: user || undefined }) };
}

function sendMessage(body) {
  const { from, to, room, content } = body || {};
  if (!from || !content) {
    return { error: { status: 400, message: 'Message sender and content are required.' } };
  }
  const message = messageRepository.insertMessage({
    from,
    to: to || null,
    room: room || 'global',
    content
  });
  return { data: message, status: 201 };
}

module.exports = { getHistory, sendMessage };
