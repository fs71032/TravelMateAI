const destinationService = require('../services/destinationService');
const { sendServiceResult } = require('./controllerUtils');

module.exports = {
  list: (_req, res) => sendServiceResult(res, destinationService.list())
};
