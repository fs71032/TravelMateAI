const entityRepository = require('../repositories/entityRepository');
const auditService = require('./auditService');
const { generateId } = require('../utils/ids');
const { sqlNow } = require('../utils/dateFormat');

function listRoles() {
  return { data: entityRepository.list('roles', 'name') };
}

function createRole({ name, description }) {
  if (!name) return { error: { status: 400, message: 'Role name is required.' } };
  const id = generateId('role');
  const role = entityRepository.insert('roles', ['id', 'name', 'description'], [id, name.trim(), description || null]);
  auditService.logAction({ action: 'create', tableName: 'roles', recordId: id, details: role });
  return { data: role, status: 201 };
}

function getRole(id) {
  const role = entityRepository.findById('roles', id);
  if (!role) return { error: { status: 404, message: 'Role not found.' } };
  return { data: role };
}

function updateRole(id, { name, description }) {
  const role = entityRepository.findById('roles', id);
  if (!role) return { error: { status: 404, message: 'Role not found.' } };
  const pairs = [];
  if (typeof name === 'string') pairs.push(['name', name.trim()]);
  if (typeof description === 'string') pairs.push(['description', description]);
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  const updated = entityRepository.updateFields('roles', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'roles', recordId: id, details: updated });
  return { data: updated };
}

function deleteRole(id) {
  const result = entityRepository.remove('roles', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Role not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'roles', recordId: id });
  return { status: 204 };
}

function listPermissions() {
  return { data: entityRepository.list('permissions', 'name') };
}

function createPermission({ name, description }) {
  if (!name) return { error: { status: 400, message: 'Permission name is required.' } };
  const id = generateId('permission');
  const permission = entityRepository.insert('permissions', ['id', 'name', 'description'], [id, name.trim(), description || null]);
  auditService.logAction({ action: 'create', tableName: 'permissions', recordId: id, details: permission });
  return { data: permission, status: 201 };
}

function getPermission(id) {
  const permission = entityRepository.findById('permissions', id);
  if (!permission) return { error: { status: 404, message: 'Permission not found.' } };
  return { data: permission };
}

function updatePermission(id, body) {
  const permission = entityRepository.findById('permissions', id);
  if (!permission) return { error: { status: 404, message: 'Permission not found.' } };
  const pairs = [];
  if (typeof body.name === 'string') pairs.push(['name', body.name.trim()]);
  if (typeof body.description === 'string') pairs.push(['description', body.description]);
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  const updated = entityRepository.updateFields('permissions', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'permissions', recordId: id, details: updated });
  return { data: updated };
}

function deletePermission(id) {
  const result = entityRepository.remove('permissions', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Permission not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'permissions', recordId: id });
  return { status: 204 };
}

function listRolePermissions() {
  return { data: entityRepository.list('role_permissions', 'created_at DESC') };
}

function createRolePermission({ roleId, permissionId }) {
  if (!roleId || !permissionId) {
    return { error: { status: 400, message: 'roleId and permissionId are required.' } };
  }
  const id = generateId('roleperm');
  try {
    const item = entityRepository.insert('role_permissions', ['id', 'role_id', 'permission_id'], [id, roleId, permissionId]);
    auditService.logAction({ action: 'create', tableName: 'role_permissions', recordId: id, details: item });
    return { data: item, status: 201 };
  } catch (error) {
    return { error: { status: 400, message: 'Role permission already exists or invalid role/permission.' } };
  }
}

function deleteRolePermission(id) {
  const result = entityRepository.remove('role_permissions', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Role permission not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'role_permissions', recordId: id });
  return { status: 204 };
}

function listUserRoles() {
  return { data: entityRepository.list('user_roles', 'assigned_at DESC') };
}

function createUserRole({ userId, roleId }) {
  if (!userId || !roleId) {
    return { error: { status: 400, message: 'userId and roleId are required.' } };
  }
  const id = generateId('userrole');
  try {
    const item = entityRepository.insert('user_roles', ['id', 'user_id', 'role_id'], [id, userId, roleId]);
    auditService.logAction({ action: 'create', tableName: 'user_roles', recordId: id, details: item });
    return { data: item, status: 201 };
  } catch (error) {
    return { error: { status: 400, message: 'User role already exists or invalid user/role.' } };
  }
}

function deleteUserRole(id) {
  const result = entityRepository.remove('user_roles', id);
  if (result.changes === 0) return { error: { status: 404, message: 'User role not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'user_roles', recordId: id });
  return { status: 204 };
}

module.exports = {
  listRoles,
  createRole,
  getRole,
  updateRole,
  deleteRole,
  listPermissions,
  createPermission,
  getPermission,
  updatePermission,
  deletePermission,
  listRolePermissions,
  createRolePermission,
  deleteRolePermission,
  listUserRoles,
  createUserRole,
  deleteUserRole
};
