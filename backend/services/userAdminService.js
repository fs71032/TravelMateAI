const userAdminRepository = require('../repositories/userAdminRepository');
const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');

function listUsers() {
  return { data: userAdminRepository.listAll() };
}

function getUser(id, requester) {
  if (requester.id !== id && requester.role !== 'admin') {
    return { error: { status: 403, message: 'Forbidden.' } };
  }
  const user = userAdminRepository.findPublicById(id);
  if (!user) {
    return { error: { status: 404, message: 'User not found.' } };
  }
  return { data: user };
}

function updateUser(id, body) {
  const { name, role, is_active } = body || {};
  const existing = userAdminRepository.findRawById(id);
  if (!existing) {
    return { error: { status: 404, message: 'User not found.' } };
  }

  let profileFields = null;
  if (typeof name === 'string') {
    const { first_name, last_name } = userRepository.splitName(name);
    profileFields = { first_name, last_name };
  }
  if (typeof is_active === 'boolean') {
    profileFields = { ...(profileFields || {}), is_active };
  }

  if (!profileFields && typeof role !== 'string') {
    return { error: { status: 400, message: 'No valid fields to update.' } };
  }

  if (profileFields) {
    userAdminRepository.updateProfile(id, profileFields);
  }
  if (typeof role === 'string') {
    userAdminRepository.setUserRole(id, role);
  }

  const user = userAdminRepository.findPublicById(id);
  auditRepository.insertAuditLog({
    userId: id,
    action: 'update',
    entity: 'users',
    entityId: id,
    newValue: user
  });
  return { data: user };
}

function deleteUser(id) {
  const result = userAdminRepository.remove(id);
  if (result.changes === 0) {
    return { error: { status: 404, message: 'User not found.' } };
  }
  auditRepository.insertAuditLog({ action: 'delete', tableName: 'users', recordId: id });
  return { status: 204 };
}

module.exports = { listUsers, getUser, updateUser, deleteUser };
