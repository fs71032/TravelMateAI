const jwt = require('jsonwebtoken');
const { findById, getPrimaryRoleName } = require('../repositories/userRepository');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) {
    return secret.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production (.env)');
  }
  return 'travelmate-dev-secret-do-not-use-in-production';
}

const jwtSecret = getJwtSecret();
const jwtExpiry = process.env.JWT_EXPIRY || '15m';

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role || getPrimaryRoleName(user.id)
    },
    jwtSecret,
    { expiresIn: jwtExpiry }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret);
}

function parseAuthorizationHeader(header) {
  if (!header || typeof header !== 'string') {
    return null;
  }

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

function getUserFromToken(token) {
  const payload = verifyAccessToken(token);
  if (!payload || !payload.sub) {
    return null;
  }
  return findById(payload.sub);
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  parseAuthorizationHeader,
  getUserFromToken,
  getJwtSecret
};
