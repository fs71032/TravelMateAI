const searchService = require('../services/searchService');
const { sendServiceResult } = require('./controllerUtils');

module.exports = {
  search: (req, res) => sendServiceResult(res, searchService.search(req.query))
};
