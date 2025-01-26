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