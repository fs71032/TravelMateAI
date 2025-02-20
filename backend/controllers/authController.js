const authBusinessService = require('../services/authBusinessService');
const { sendServiceResult } = require('./controllerUtils');

function login(req, res) {
  try {
    console.log(`[auth] login attempt for: ${req.body.email}`);
    const result = authBusinessService.login(req.body.email, req.body.password);
    if (result.error) console.log(`[auth] login failed: ${result.error.message}`);
    else console.log(`[auth] login succeeded for ${req.body.email}`);
    return sendServiceResult(res, result);
  } catch (error) {
    console.error('[auth] login error:', error.message);
    return res.status(500).json({ message: 'Unable to sign in right now. Please try again.' });
  }
}

function register(req, res) {
  console.log(`[auth] register attempt for: ${req.body.email}`);
  return sendServiceResult(res, authBusinessService.register(req.body));
}

function updateProfile(req, res) {
  const result = authBusinessService.updateProfile(req.user.email, {
    name: typeof req.body.name === 'string' ? req.body.name.trim() : '',
    password: typeof req.body.password === 'string' ? req.body.password.trim() : ''
  });
  if (!result.error && result.data) {
    result.data.refreshToken = req.body.refreshToken || null;
  }
  return sendServiceResult(res, result);
}

function refresh(req, res) {
  return sendServiceResult(res, authBusinessService.refreshAccessToken(req.body?.refreshToken));
}

function listRefreshTokens(_req, res) {
  return sendServiceResult(res, authBusinessService.listRefreshTokens());
}

function revokeRefreshToken(req, res) {
  return sendServiceResult(res, authBusinessService.revokeRefreshToken(req.params.id));
}

module.exports = { login, register, updateProfile, refresh, listRefreshTokens, revokeRefreshToken };
