const { parseAuthorizationHeader, getUserFromToken } = require('../services/authService');

function requireAuth(req, res, next) {
  const token = parseAuthorizationHeader(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: 'Authorization header missing or malformed.' });
  }

  try {
    const user = getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token or user not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    const checkRole = () => {
      if (!allowed.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      return next();
    };

    if (!req.user) {
      return requireAuth(req, res, checkRole);
    }
    return checkRole();
  };
}

/** Optional Bearer token for socket payloads */
function resolveUserFromAccessToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    return getUserFromToken(token);
  } catch {
    return null;
  }
}

module.exports = {
  requireAuth,
  requireRole,
  resolveUserFromAccessToken
};
