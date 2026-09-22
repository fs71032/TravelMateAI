const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const destinationService = require('./services/destinationService');
const messageRepository = require('./repositories/messageRepository');
const notificationRepository = require('./repositories/notificationRepository');
const { normalizeEmail } = require('./utils/email');
const { setIo, emitNotification } = require('./utils/socketEmitter');
const { setUserOnline, removeUserOnline, getOnlineUser, listOnlineUsers } = require('./services/presenceStore');
const { resolveUserFromAccessToken } = require('./middleware/authMiddleware');
const healthController = require('./controllers/healthController');
const apiRoutes = require('./routes');

try {
  destinationService.sync();
  console.log('[db] destinations synced (Lisbon, Reykjavík, Amalfi Coast)');
} catch (error) {
  console.warn('[db] destinations sync skipped:', error.message);
}

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const isDevelopment = process.env.NODE_ENV !== 'production';

function isOriginAllowed(origin) {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) return true;

  if (isDevelopment && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }

  if (
    isDevelopment &&
    /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(
      origin
    )
  ) {
    return true;
  }

  if (process.env.CORS_ALLOW_FILE === 'true' && (origin === 'null' || origin.startsWith('file://'))) {
    return true;
  }

  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error('CORS policy: origin not allowed'));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.text({ type: ['text/csv', 'application/csv', 'text/plain'] }));
app.use(
  express.raw({
    type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
    limit: '10mb'
  })
);

const openapiSpec = require('./openapi.json');
const swaggerUi = require('swagger-ui-express');

app.get('/api/openapi.json', (_req, res) => {
  res.json(openapiSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'TravelMate AI API' }));

app.get('/', healthController.root);
app.use('/api', apiRoutes);

const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error('CORS policy: origin not allowed'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

setIo(io);

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('identify', async (payload) => {
    if (!payload || !payload.email) return;

    const tokenUser = resolveUserFromAccessToken(payload.accessToken || payload.token);
    if (!tokenUser) {
      socket.emit('identify:error', { message: 'Valid access token required.' });
      return;
    }

    const normalizedEmail = normalizeEmail(payload.email);
    if (normalizeEmail(tokenUser.email) !== normalizedEmail) {
      socket.emit('identify:error', { message: 'Token does not match user.' });
      return;
    }

    await setUserOnline(normalizedEmail, socket.id, {
      email: tokenUser.email,
      name: payload.name || tokenUser.name
    });
    socket.data.user = tokenUser;
    socket.data.normalizedEmail = normalizedEmail;
    socket.join('global');
    socket.join(`user:${normalizedEmail}`);
    io.to('global').emit('presence', await listOnlineUsers());
  });

  socket.on('join', (room) => {
    socket.join(room);
  });

  socket.on('message', async (payload) => {
    const { to, room, content, from, accessToken, token } = payload || {};
    const tokenUser = socket.data.user || resolveUserFromAccessToken(accessToken || token);
    if (!tokenUser) {
      socket.emit('message:error', { message: 'Authentication required.' });
      return;
    }

    let msg;
    try {
      msg = messageRepository.insertMessage({
        from: from || tokenUser.email,
        to: to || null,
        room: room || 'global',
        content
      });
    } catch (error) {
      console.error('[socket] failed to store message:', error);
      socket.emit('message:error', { message: 'Failed to send message.' });
      return;
    }

    if (to) {
      const recipientRoom = `user:${normalizeEmail(to)}`;
      io.to(recipientRoom).emit('message', msg);
      socket.emit('message', msg);
    } else {
      io.to(msg.room).emit('message', msg);
    }

    const senderEmail = normalizeEmail(msg.from);
    const preview = String(content || '').trim().slice(0, 120);
    if (to) {
      const recipientEmail = normalizeEmail(to);
      if (recipientEmail && recipientEmail !== senderEmail && preview) {
        const notification = notificationRepository.createNotification({
          type: 'chat',
          title: 'New private message',
          message: `${tokenUser.name || msg.from}: ${preview}`,
          userEmail: to
        });
        emitNotification(notification);
      }
    } else if (msg.room === 'global' && preview) {
      const senderName = tokenUser.name || msg.from;
      const onlineUsers = await listOnlineUsers();
      for (const entry of onlineUsers) {
        const email = entry.email || entry.user?.email;
        if (!email || normalizeEmail(email) === senderEmail) continue;
        const notification = notificationRepository.createNotification({
          type: 'chat',
          title: 'New group message',
          message: `${senderName}: ${preview}`,
          userEmail: email
        });
        emitNotification(notification);
      }
    }
  });

  socket.on('disconnect', async () => {
    const normalizedEmail = socket.data.normalizedEmail;
    if (normalizedEmail) {
      await removeUserOnline(normalizedEmail);
      io.to('global').emit('presence', await listOnlineUsers());
    }
  });
});

const port = process.env.PORT || 4000;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n[server] Port ${port} is already in use.`);
    console.error('[server] Another backend is probably still running in another terminal.');
    console.error('[server] Free the port and restart with: npm run start:clean');
    console.error('[server] Or only free the port with: npm run kill-port\n');
    process.exit(1);
  }
  throw error;
});

server.listen(port, '0.0.0.0', () => {
  const os = require('os');
  const lanUrls = [];

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces || []) {
      if (net.family === 'IPv4' && !net.internal) {
        lanUrls.push(`http://${net.address}:${port}`);
      }
    }
  }

  console.log(`TravelMate API listening on http://localhost:${port}`);
  if (lanUrls.length) {
    console.log(`[network] LAN API: ${lanUrls.join(', ')}`);
    console.log(`[network] LAN frontend (share this): ${lanUrls.map((url) => url.replace(`:${port}`, ':5173')).join(', ')}`);
  }
  console.log('[architecture] controllers -> services -> repositories');
});

module.exports = { app, server, io };
