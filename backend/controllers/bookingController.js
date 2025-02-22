const bookingService = require('../services/bookingService');
const { sendServiceResult } = require('./controllerUtils');

function list(_req, res) {
  return sendServiceResult(res, bookingService.listBookings());
}

function getById(req, res) {
  return sendServiceResult(res, bookingService.getBooking(req.params.id));
}

function create(req, res) {
  return sendServiceResult(res, bookingService.createBooking(req.body));
}

function update(req, res) {
  return sendServiceResult(res, bookingService.updateBookingStatus(req.params.id, req.body?.status));
}

function remove(req, res) {
  return sendServiceResult(res, bookingService.deleteBooking(req.params.id));
}

module.exports = { list, getById, create, update, remove };
