const auditRepository = require('../repositories/auditRepository');

function logAction(payload) {
  auditRepository.insertAuditLog(payload);
}

function listAuditLogs() {
  return { data: auditRepository.listRecent() };
}

module.exports = { logAction, listAuditLogs };
