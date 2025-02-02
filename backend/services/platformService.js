const entityRepository = require('../repositories/entityRepository');
const auditService = require('./auditService');
const { generateId } = require('../utils/ids');
const { sqlNow } = require('../utils/dateFormat');

function listSettings(userId) {
  const rows = userId
    ? entityRepository.listWhere('settings', 'user_id = ?', [userId], 'updated_at DESC')
    : entityRepository.list('settings', 'updated_at DESC');
  return { data: rows };
}

function createSetting({ userId, key, value, description }) {
  if (!key) return { error: { status: 400, message: 'Setting key is required.' } };
  const id = generateId('setting');
  const now = sqlNow();
  const item = entityRepository.insert(
    'settings',
    ['id', 'user_id', 'key', 'value', 'description', 'created_at', 'updated_at'],
    [id, userId || null, key, value || null, description || null, now, now]
  );
  auditService.logAction({ action: 'create', entity: 'settings', entityId: id, newValue: item });
  return { data: item, status: 201 };
}

function updateSetting(id, { value }) {
  const existing = entityRepository.findById('settings', id);
  if (!existing) return { error: { status: 404, message: 'Setting not found.' } };
  const item = entityRepository.updateWithTimestamp('settings', id, [['value', value || null]]);
  auditService.logAction({ action: 'update', tableName: 'settings', recordId: id, details: item });
  return { data: item };
}

function listChatRooms() {
  return { data: entityRepository.list('chat_rooms', 'name') };
}

function createChatRoom({ name, description, is_private }) {
  if (!name) return { error: { status: 400, message: 'Chat room name is required.' } };
  const id = generateId('room');
  const room = entityRepository.insert(
    'chat_rooms',
    ['id', 'name', 'description', 'is_private'],
    [id, name.trim(), description || null, is_private ? 1 : 0]
  );
  auditService.logAction({ action: 'create', tableName: 'chat_rooms', recordId: id, details: room });
  return { data: room, status: 201 };
}

function getChatRoom(id) {
  const room = entityRepository.findById('chat_rooms', id);
  if (!room) return { error: { status: 404, message: 'Chat room not found.' } };
  return { data: room };
}

function updateChatRoom(id, body) {
  const room = entityRepository.findById('chat_rooms', id);
  if (!room) return { error: { status: 404, message: 'Chat room not found.' } };
  const pairs = [];
  if (typeof body.name === 'string') pairs.push(['name', body.name.trim()]);
  if (typeof body.description === 'string') pairs.push(['description', body.description]);
  if (typeof body.is_private === 'boolean') pairs.push(['is_private', body.is_private ? 1 : 0]);
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  const updated = entityRepository.updateFields('chat_rooms', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'chat_rooms', recordId: id, details: updated });
  return { data: updated };
}

function deleteChatRoom(id) {
  const result = entityRepository.remove('chat_rooms', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Chat room not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'chat_rooms', recordId: id });
  return { status: 204 };
}

function listGuides() {
  return { data: entityRepository.list('guides', 'name') };
}

function createGuide(body) {
  if (!body.name) return { error: { status: 400, message: 'Guide name is required.' } };
  const id = generateId('guide');
  const item = entityRepository.insert(
    'guides',
    ['id', 'name', 'language', 'specialty', 'contact', 'bio'],
    [id, body.name.trim(), body.language || null, body.specialty || null, body.contact || null, body.bio || null]
  );
  auditService.logAction({ action: 'create', tableName: 'guides', recordId: id, details: item });
  return { data: item, status: 201 };
}

function updateGuide(id, body) {
  const guide = entityRepository.findById('guides', id);
  if (!guide) return { error: { status: 404, message: 'Guide not found.' } };
  const pairs = [];
  if (typeof body.name === 'string') pairs.push(['name', body.name.trim()]);
  if (typeof body.language === 'string') pairs.push(['language', body.language]);
  if (typeof body.specialty === 'string') pairs.push(['specialty', body.specialty]);
  if (typeof body.contact === 'string') pairs.push(['contact', body.contact]);
  if (typeof body.bio === 'string') pairs.push(['bio', body.bio]);
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  const updated = entityRepository.updateFields('guides', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'guides', recordId: id, details: updated });
  return { data: updated };
}

function deleteGuide(id) {
  const result = entityRepository.remove('guides', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Guide not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'guides', recordId: id });
  return { status: 204 };
}

function listTravelGroups() {
  return { data: entityRepository.list('travel_groups', 'created_at DESC') };
}

function createTravelGroup({ name, description, ownerId }) {
  if (!name || !ownerId) return { error: { status: 400, message: 'Group name and ownerId are required.' } };
  const id = generateId('group');
  const item = entityRepository.insert(
    'travel_groups',
    ['id', 'name', 'description', 'owner_id'],
    [id, name.trim(), description || null, ownerId]
  );
  auditService.logAction({ action: 'create', tableName: 'travel_groups', recordId: id, details: item });
  return { data: item, status: 201 };
}

function updateTravelGroup(id, body) {
  const group = entityRepository.findById('travel_groups', id);
  if (!group) return { error: { status: 404, message: 'Travel group not found.' } };
  const pairs = [];
  if (typeof body.name === 'string') pairs.push(['name', body.name.trim()]);
  if (typeof body.description === 'string') pairs.push(['description', body.description]);
  if (typeof body.ownerId === 'string') pairs.push(['owner_id', body.ownerId]);
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  const updated = entityRepository.updateFields('travel_groups', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'travel_groups', recordId: id, details: updated });
  return { data: updated };
}

function deleteTravelGroup(id) {
  const result = entityRepository.remove('travel_groups', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Travel group not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'travel_groups', recordId: id });
  return { status: 204 };
}

function listGroupMembers(groupId) {
  const rows = groupId
    ? entityRepository.listWhere('group_members', 'travel_group_id = ?', [groupId], 'joined_at DESC')
    : entityRepository.list('group_members', 'joined_at DESC');
  return { data: rows };
}

function createGroupMember({ travelGroupId, userId, role }) {
  if (!travelGroupId || !userId) {
    return { error: { status: 400, message: 'travelGroupId and userId are required.' } };
  }
  const id = generateId('member');
  try {
    const item = entityRepository.insert(
      'group_members',
      ['id', 'travel_group_id', 'user_id', 'role'],
      [id, travelGroupId, userId, role || 'member']
    );
    auditService.logAction({ action: 'create', tableName: 'group_members', recordId: id, details: item });
    return { data: item, status: 201 };
  } catch (error) {
    return { error: { status: 400, message: 'Group membership already exists or invalid group/user.' } };
  }
}

function deleteGroupMember(id) {
  const result = entityRepository.remove('group_members', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Group member not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'group_members', recordId: id });
  return { status: 204 };
}

function listSuppliers() {
  return { data: entityRepository.list('booking_suppliers', 'name') };
}

function createSupplier(body) {
  if (!body.name) return { error: { status: 400, message: 'Supplier name is required.' } };
  const id = generateId('supplier');
  const item = entityRepository.insert(
    'booking_suppliers',
    ['id', 'name', 'type', 'contact', 'phone', 'email', 'details'],
    [id, body.name.trim(), body.type || null, body.contact || null, body.phone || null, body.email || null, body.details || null]
  );
  auditService.logAction({ action: 'create', tableName: 'booking_suppliers', recordId: id, details: item });
  return { data: item, status: 201 };
}

function updateSupplier(id, body) {
  const supplier = entityRepository.findById('booking_suppliers', id);
  if (!supplier) return { error: { status: 404, message: 'Supplier not found.' } };
  const pairs = [];
  ['name', 'type', 'contact', 'phone', 'email', 'details'].forEach((field) => {
    if (typeof body[field] === 'string') {
      pairs.push([field === 'name' ? 'name' : field, field === 'name' ? body[field].trim() : body[field]]);
    }
  });
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  const updated = entityRepository.updateFields('booking_suppliers', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'booking_suppliers', recordId: id, details: updated });
  return { data: updated };
}

function deleteSupplier(id) {
  const result = entityRepository.remove('booking_suppliers', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Supplier not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'booking_suppliers', recordId: id });
  return { status: 204 };
}

function listInvoices() {
  return { data: entityRepository.list('invoices', 'issued_at DESC') };
}

function createInvoice(body) {
  if (typeof body.amount !== 'number') {
    return { error: { status: 400, message: 'Invoice amount must be a number.' } };
  }
  const id = generateId('invoice');
  const item = entityRepository.insert(
    'invoices',
    ['id', 'user_id', 'booking_id', 'amount', 'currency', 'due_date', 'status', 'pdf_path'],
    [id, body.userId || null, body.bookingId || null, body.amount, body.currency || 'EUR', body.dueDate || null, body.status || 'Unpaid', body.pdfPath || null]
  );
  auditService.logAction({ action: 'create', tableName: 'invoices', recordId: id, details: item });
  return { data: item, status: 201 };
}

function updateInvoice(id, body) {
  const invoice = entityRepository.findById('invoices', id);
  if (!invoice) return { error: { status: 404, message: 'Invoice not found.' } };
  const pairs = [];
  if (typeof body.amount === 'number') pairs.push(['amount', body.amount]);
  if (typeof body.currency === 'string') pairs.push(['currency', body.currency]);
  if (typeof body.dueDate === 'string') pairs.push(['due_date', body.dueDate]);
  if (typeof body.status === 'string') pairs.push(['status', body.status]);
  if (typeof body.pdfPath === 'string') pairs.push(['pdf_path', body.pdfPath]);
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  const updated = entityRepository.updateFields('invoices', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'invoices', recordId: id, details: updated });
  return { data: updated };
}

function deleteInvoice(id) {
  const result = entityRepository.remove('invoices', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Invoice not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'invoices', recordId: id });
  return { status: 204 };
}

function listPayments() {
  return { data: entityRepository.list('payments', 'created_at DESC') };
}

function createPayment(body) {
  if (typeof body.amount !== 'number') {
    return { error: { status: 400, message: 'Payment amount must be a number.' } };
  }
  const id = generateId('payment');
  const item = entityRepository.insert(
    'payments',
    ['id', 'user_id', 'booking_id', 'amount', 'currency', 'status', 'method', 'paid_at'],
    [id, body.userId || null, body.bookingId || null, body.amount, body.currency || 'EUR', body.status || 'Pending', body.method || null, body.paidAt || null]
  );
  auditService.logAction({ action: 'create', tableName: 'payments', recordId: id, details: item });
  return { data: item, status: 201 };
}

function updatePayment(id, body) {
  const payment = entityRepository.findById('payments', id);
  if (!payment) return { error: { status: 404, message: 'Payment not found.' } };
  const pairs = [];
  if (typeof body.amount === 'number') pairs.push(['amount', body.amount]);
  if (typeof body.currency === 'string') pairs.push(['currency', body.currency]);
  if (typeof body.status === 'string') pairs.push(['status', body.status]);
  if (typeof body.method === 'string') pairs.push(['method', body.method]);
  if (typeof body.paidAt === 'string') pairs.push(['paid_at', body.paidAt]);
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  const updated = entityRepository.updateFields('payments', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'payments', recordId: id, details: updated });
  return { data: updated };
}

function deletePayment(id) {
  const result = entityRepository.remove('payments', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Payment not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'payments', recordId: id });
  return { status: 204 };
}

function listFiles() {
  return { data: entityRepository.list('files', 'created_at DESC') };
}

function createFile(body, userId) {
  const resolvedEntity = body.entity || body.relatedTable || null;
  const resolvedEntityId = body.entityId || body.relatedId || null;
  const resolvedPath = body.filePath || body.url;
  if (!body.filename || !resolvedPath) {
    return { error: { status: 400, message: 'filename and filePath (or url) are required.' } };
  }
  const id = generateId('file');
  const now = sqlNow();
  const item = entityRepository.insert(
    'files',
    ['id', 'entity', 'entity_id', 'filename', 'file_path', 'file_size', 'mime_type', 'uploaded_by', 'created_by', 'created_at', 'updated_at'],
    [
      id,
      resolvedEntity,
      resolvedEntityId,
      body.filename.trim(),
      resolvedPath.trim(),
      typeof body.fileSize === 'number' ? body.fileSize : null,
      body.mimeType || null,
      userId || null,
      userId || null,
      now,
      now
    ]
  );
  auditService.logAction({ action: 'create', entity: 'files', entityId: id, newValue: item });
  return { data: item, status: 201 };
}

function updateFile(id, body) {
  const file = entityRepository.findById('files', id);
  if (!file) return { error: { status: 404, message: 'File not found.' } };
  const pairs = [];
  const resolvedEntity = body.entity || body.relatedTable;
  const resolvedEntityId = body.entityId || body.relatedId;
  const resolvedPath = body.filePath || body.url;
  if (typeof resolvedEntity === 'string') pairs.push(['entity', resolvedEntity]);
  if (typeof resolvedEntityId === 'string') pairs.push(['entity_id', resolvedEntityId]);
  if (typeof body.filename === 'string') pairs.push(['filename', body.filename.trim()]);
  if (typeof body.mimeType === 'string') pairs.push(['mime_type', body.mimeType]);
  if (typeof resolvedPath === 'string') pairs.push(['file_path', resolvedPath.trim()]);
  if (typeof body.fileSize === 'number') pairs.push(['file_size', body.fileSize]);
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  pairs.push(['updated_at', sqlNow()]);
  const updated = entityRepository.updateFields('files', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'files', recordId: id, details: updated });
  return { data: updated };
}

function deleteFile(id) {
  const result = entityRepository.remove('files', id);
  if (result.changes === 0) return { error: { status: 404, message: 'File not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'files', recordId: id });
  return { status: 204 };
}

function listReviews() {
  return { data: entityRepository.list('reviews', 'created_at DESC') };
}

function createReview(body, userId) {
  const resolvedEntity = body.entity || body.targetTable;
  const resolvedEntityId = body.entityId || body.targetId;
  if (!resolvedEntity || !resolvedEntityId || !userId) {
    return { error: { status: 400, message: 'entity, entityId and authenticated user are required.' } };
  }
  const id = generateId('review');
  const now = sqlNow();
  const item = entityRepository.insert(
    'reviews',
    ['id', 'entity', 'entity_id', 'user_id', 'rating', 'comment', 'created_by', 'created_at', 'updated_at'],
    [id, resolvedEntity, resolvedEntityId, userId, Number(body.rating) || 5, body.comment || null, userId, now, now]
  );
  auditService.logAction({ action: 'create', entity: 'reviews', entityId: id, newValue: item });
  return { data: item, status: 201 };
}

function deleteReview(id) {
  const existing = entityRepository.findById('reviews', id);
  if (!existing) return { error: { status: 404, message: 'Review not found.' } };
  entityRepository.remove('reviews', id);
  auditService.logAction({ action: 'delete', tableName: 'reviews', recordId: id, details: existing });
  return { data: { message: 'Review deleted.' } };
}

function listFavorites() {
  return { data: entityRepository.list('favorites', 'created_at DESC') };
}

function createFavorite(body) {
  const resolvedEntity = body.entity || body.targetTable;
  const resolvedEntityId = body.entityId || body.targetId;
  if (!body.userId || !resolvedEntity || !resolvedEntityId) {
    return { error: { status: 400, message: 'userId, entity and entityId are required.' } };
  }
  const existing = entityRepository.listWhere(
    'favorites',
    'user_id = ? AND entity = ? AND entity_id = ?',
    [body.userId, resolvedEntity, resolvedEntityId],
    'created_at DESC'
  )[0];
  if (existing) return { data: existing };

  const id = generateId('favorite');
  const now = sqlNow();
  const item = entityRepository.insert(
    'favorites',
    ['id', 'user_id', 'entity', 'entity_id', 'created_by', 'created_at', 'updated_at'],
    [id, body.userId, resolvedEntity, resolvedEntityId, body.userId, now, now]
  );
  auditService.logAction({ action: 'create', entity: 'favorites', entityId: id, newValue: item });
  return { data: item, status: 201 };
}

function deleteFavorite(id) {
  const existing = entityRepository.findById('favorites', id);
  if (!existing) return { error: { status: 404, message: 'Favorite not found.' } };
  entityRepository.remove('favorites', id);
  auditService.logAction({ action: 'delete', tableName: 'favorites', recordId: id, details: existing });
  return { data: { message: 'Favorite removed.' } };
}

function updateNotification(id, body) {
  const existing = entityRepository.findById('notifications', id);
  if (!existing) return { error: { status: 404, message: 'Notification not found.' } };
  const pairs = [];
  if (typeof body.isRead === 'boolean') pairs.push(['is_read', body.isRead ? 1 : 0]);
  if (typeof body.title === 'string') pairs.push(['title', body.title]);
  if (typeof body.message === 'string') pairs.push(['message', body.message]);
  if (!pairs.length) return { error: { status: 400, message: 'No valid fields to update.' } };
  const updated = entityRepository.updateWithTimestamp('notifications', id, pairs);
  auditService.logAction({ action: 'update', tableName: 'notifications', recordId: id, details: updated });
  return { data: updated };
}

function deleteNotification(id) {
  const result = entityRepository.remove('notifications', id);
  if (result.changes === 0) return { error: { status: 404, message: 'Notification not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'notifications', recordId: id });
  return { status: 204 };
}

module.exports = {
  listSettings,
  createSetting,
  updateSetting,
  listChatRooms,
  createChatRoom,
  getChatRoom,
  updateChatRoom,
  deleteChatRoom,
  listGuides,
  createGuide,
  updateGuide,
  deleteGuide,
  listTravelGroups,
  createTravelGroup,
  updateTravelGroup,
  deleteTravelGroup,
  listGroupMembers,
  createGroupMember,
  deleteGroupMember,
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  listPayments,
  createPayment,
  updatePayment,
  deletePayment,
  listFiles,
  createFile,
  updateFile,
  deleteFile,
  listReviews,
  createReview,
  deleteReview,
  listFavorites,
  createFavorite,
  deleteFavorite,
  updateNotification,
  deleteNotification
};
