const rbacService = require('../services/rbacService');
const { sendServiceResult } = require('./controllerUtils');

module.exports = {
  listRoles: (_req, res) => sendServiceResult(res, rbacService.listRoles()),
  createRole: (req, res) => sendServiceResult(res, rbacService.createRole(req.body)),
  getRole: (req, res) => sendServiceResult(res, rbacService.getRole(req.params.id)),
  updateRole: (req, res) => sendServiceResult(res, rbacService.updateRole(req.params.id, req.body)),
  deleteRole: (req, res) => sendServiceResult(res, rbacService.deleteRole(req.params.id)),
  listPermissions: (_req, res) => sendServiceResult(res, rbacService.listPermissions()),
  createPermission: (req, res) => sendServiceResult(res, rbacService.createPermission(req.body)),
  getPermission: (req, res) => sendServiceResult(res, rbacService.getPermission(req.params.id)),
  updatePermission: (req, res) => sendServiceResult(res, rbacService.updatePermission(req.params.id, req.body)),
  deletePermission: (req, res) => sendServiceResult(res, rbacService.deletePermission(req.params.id)),
  listRolePermissions: (_req, res) => sendServiceResult(res, rbacService.listRolePermissions()),
  createRolePermission: (req, res) => sendServiceResult(res, rbacService.createRolePermission(req.body)),
  deleteRolePermission: (req, res) => sendServiceResult(res, rbacService.deleteRolePermission(req.params.id)),
  listUserRoles: (_req, res) => sendServiceResult(res, rbacService.listUserRoles()),
  createUserRole: (req, res) => sendServiceResult(res, rbacService.createUserRole(req.body)),
  deleteUserRole: (req, res) => sendServiceResult(res, rbacService.deleteUserRole(req.params.id))
};
