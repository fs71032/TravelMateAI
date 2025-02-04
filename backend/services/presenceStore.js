const Redis = require('ioredis');

const PRESENCE_KEY = 'travelmate:online_users';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null
});

let warned = false;
redis.on('error', (error) => {
  if (!warned) {
    console.warn('[presence] Redis unavailable, live presence will be degraded:', error.message);
    warned = true;
  }
});

// A fresh process can't own any socket connections from a previous run, so any
// presence left behind by a non-graceful shutdown (crash, kill -9) is stale.
redis
  .connect()
  .then(() => redis.del(PRESENCE_KEY))
  .catch(() => {});

async function setUserOnline(email, socketId, user) {
  try {
    await redis.hset(PRESENCE_KEY, email, JSON.stringify({ socketId, user }));
  } catch (error) {
    // Redis unreachable: presence tracking degrades gracefully, chat itself still works.
  }
}

async function removeUserOnline(email) {
  try {
    await redis.hdel(PRESENCE_KEY, email);
  } catch (error) {
    // ignore
  }
}

async function getOnlineUser(email) {
  try {
    const raw = await redis.hget(PRESENCE_KEY, email);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

async function listOnlineUsers() {
  try {
    const raw = await redis.hgetall(PRESENCE_KEY);
    return Object.values(raw).map((entry) => JSON.parse(entry).user);
  } catch (error) {
    return [];
  }
}

module.exports = { setUserOnline, removeUserOnline, getOnlineUser, listOnlineUsers };
