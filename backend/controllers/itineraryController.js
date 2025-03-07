const itineraryBusinessService = require('../services/itineraryBusinessService');
const { sendServiceResult, sendServiceResultAsync } = require('./controllerUtils');

module.exports = {
  status: (_req, res) => sendServiceResult(res, itineraryBusinessService.getStatus()),
  generate: (req, res) => sendServiceResultAsync(res, itineraryBusinessService.generatePlan(req.body)),
  listPlans: (req, res) => sendServiceResult(res, itineraryBusinessService.listPlans(req.query.userEmail || req.query.user)),
  savePlan: (req, res) => sendServiceResult(res, itineraryBusinessService.savePlan(req.body)),
  deletePlan: (req, res) => sendServiceResult(res, itineraryBusinessService.deletePlan(req.params.id)),
  getPlan: (req, res) => sendServiceResult(res, itineraryBusinessService.getPlanById(req.params.id)),
  listItems: (req, res) => sendServiceResult(res, itineraryBusinessService.listItems(req.query.tripPlanId)),
  createItem: (req, res) => sendServiceResult(res, itineraryBusinessService.createItem(req.body)),
  updateItem: (req, res) => sendServiceResult(res, itineraryBusinessService.updateItem(req.params.id, req.body)),
  deleteItem: (req, res) => sendServiceResult(res, itineraryBusinessService.deleteItem(req.params.id))
};
