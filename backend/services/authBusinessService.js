const { sqlDate, isExpired } = require('../utils/dateFormat');
const { normalizeEmail } = require('../utils/email');
const userRepository = require('../repositories/userRepository');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
const { generateAccessToken } = require('./authService');

function login(email, password) {
  const normalized = normalizeEmail(email);
  const trimmedPassword = typeof password === 'string' ? password.trim() : '';

  if (!normalized || !trimmedPassword) {
    return { error: { status: 400, message: 'Email and password are required.' } };
  }

  const user = userRepository.findByEmail(normalized);
  if (!user || !userRepository.verifyPassword(user, trimmedPassword)) {
    return { error: { status: 401, message: 'Invalid email or password.' } };
  }

  const accessToken = generateAccessToken(user);
  const refresh = refreshTokenRepository.create(user.id);

  return {
    data: {
      accessToken,
      refreshToken: refresh.token,
      refreshTokenId: refresh.id,
      user: userRepository.rowToPublicUser(user)
    }
  };
}

function register({ name, email, password }) {
  const normalized = normalizeEmail(email);
  if (!name || !normalized || !password) {
    return { error: { status: 400, message: 'Name, email, and password are required.' } };
  }
  if (userRepository.emailExists(normalized)) {
    return { error: { status: 409, message: 'A user with that email already exists.' } };
  }

  const newUser = userRepository.createUser({ name, email: normalized, password });
  const accessToken = generateAccessToken(newUser);
  const refresh = refreshTokenRepository.create(newUser.id);

  return {
    data: {
      accessToken,
      refreshToken: refresh.token,
      refreshTokenId: refresh.id,
      user: userRepository.rowToPublicUser(newUser)
    },
    status: 201
  };
}

function updateProfile(email, { name, password }) {
  const updated = userRepository.updateUser(email, {
    name: name || undefined,
    password: password || undefined
  });
  if (!updated) {
    return { error: { status: 404, message: 'User not found.' } };
  }
  const accessToken = generateAccessToken(updated);
  return {
    data: {
      accessToken,
      user: userRepository.rowToPublicUser(updated)
    }
  };
}

function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    return { error: { status: 400, message: 'Refresh token is required.' } };
  }
  const stored = refreshTokenRepository.findValidByPlainToken(refreshToken);
  if (!stored || isExpired(stored.expires_at)) {
    return { error: { status: 401, message: 'Refresh token invalid or expired.' } };
  }
  const user = userRepository.findById(stored.user_id);
  if (!user) {
    return { error: { status: 401, message: 'User not found.' } };
  }
  return {
    data: {
      accessToken: generateAccessToken(user),
      refreshToken,
      user: userRepository.rowToPublicUser(user)
    }
  };
}

function listRefreshTokens() {
  return { data: refreshTokenRepository.listAll() };
}

function revokeRefreshToken(id) {
  const result = refreshTokenRepository.revoke(id);
  if (result.changes === 0) {
    return { error: { status: 404, message: 'Refresh token not found.' } };
  }
  return { status: 204 };
}

module.exports = {
  login,
  register,
  updateProfile,
  refreshAccessToken,
  listRefreshTokens,
  revokeRefreshToken
};
