const auditService = require('../services/auditService');
const { sendServiceResult } = require('./controllerUtils');

module.exports = {
  list: (_req, res) => sendServiceResult(res, auditService.listAuditLogs())
};
