const bookingRepository = require('../repositories/bookingRepository');
const auditRepository = require('../repositories/auditRepository');

const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'Cancelled'];

function listBookings() {
  return { data: bookingRepository.listAll() };
}

function getBooking(id) {
  const booking = bookingRepository.findById(id);
  if (!booking) {
    return { error: { status: 404, message: 'Booking not found.' } };
  }
  return { data: booking };
}

function createBooking(body) {
  const { type, title, status, date, amount, location, details } = body || {};
  if (!type || !title || !date) {
    return { error: { status: 400, message: 'Type, title, and date are required.' } };
  }
  try {
    const booking = bookingRepository.createLegacy({ type, title, status, date, amount, location, details });
    return { data: booking, status: 201 };
  } catch (error) {
    console.error('[bookings] creation failed:', error);
    return { error: { status: 500, message: 'Failed to create booking.' } };
  }
}

function updateBookingStatus(id, status) {
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return { error: { status: 400, message: 'Status must be Pending, Confirmed, or Cancelled.' } };
  }
  const existing = bookingRepository.findById(id);
  if (!existing) {
    return { error: { status: 404, message: 'Booking not found.' } };
  }
  return { data: bookingRepository.updateStatus(id, status) };
}

function deleteBooking(id) {
  const existing = bookingRepository.findById(id);
  if (!existing) {
    return { error: { status: 404, message: 'Booking not found.' } };
  }
  bookingRepository.remove(id);
  auditRepository.insertAuditLog({ action: 'delete', tableName: 'bookings', recordId: id });
  return { status: 204 };
}

module.exports = {
  listBookings,
  getBooking,
  createBooking,
  updateBookingStatus,
  deleteBooking
};
