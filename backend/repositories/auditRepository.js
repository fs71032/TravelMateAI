const { db } = require('../db');
const { sqlNow } = require('../utils/dateFormat');
const { generateId } = require('../utils/ids');

function insertAuditLog({
  userId,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
  ipAddress,
  details,
  tableName,
  recordId
}) {
  db.prepare(`
    INSERT INTO audit_logs (
      id, user_id, action, entity, entity_id, old_value, new_value, ip_address,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    generateId('audit'),
    userId || null,
    action,
    entity || tableName || null,
    entityId || recordId || null,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : details ? JSON.stringify(details) : null,
    ipAddress || null,
    sqlNow(),
    sqlNow()
  );
}

function listRecent(limit = 200) {
  return db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
}

module.exports = { insertAuditLog, listRecent };
