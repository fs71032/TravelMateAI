const notificationService = require('../services/notificationService');
const platformService = require('../services/platformService');
const { sendServiceResult } = require('./controllerUtils');

module.exports = {
  list: (req, res) => sendServiceResult(res, notificationService.list(req.query.userEmail || req.query.user)),
  create: (req, res) => sendServiceResult(res, notificationService.create(req.body, req.user.id)),
  update: (req, res) => sendServiceResult(res, platformService.updateNotification(req.params.id, req.body)),
  remove: (req, res) => sendServiceResult(res, platformService.deleteNotification(req.params.id))
};
