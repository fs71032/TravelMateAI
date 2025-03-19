const userAdminService = require('../services/userAdminService');
const { sendServiceResult } = require('./controllerUtils');

function list(_req, res) {
  return sendServiceResult(res, userAdminService.listUsers());
}

function getById(req, res) {
  return sendServiceResult(res, userAdminService.getUser(req.params.id, req.user));
}

function update(req, res) {
  return sendServiceResult(res, userAdminService.updateUser(req.params.id, req.body));
}

function remove(req, res) {
  return sendServiceResult(res, userAdminService.deleteUser(req.params.id));
}

module.exports = { list, getById, update, remove };
