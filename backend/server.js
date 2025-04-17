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