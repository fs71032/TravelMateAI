const { db } = require('../db');
const { sqlNow, sqlDate } = require('../utils/dateFormat');
const { generateId } = require('../utils/ids');

function listAll(limit = 100) {
  return db.prepare('SELECT * FROM bookings ORDER BY date ASC LIMIT ?').all(limit);
}

function findById(id) {
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
}

function create({ type, title, status, date, amount, location, details, tripPlanId, supplierId, createdBy, updatedBy }) {
  const id = generateId('booking');
  const now = sqlNow();
  db.prepare(`
    INSERT INTO bookings (
      id, trip_plan_id, supplier_id, type, title, status, date, amount, location, details,
      created_by, updated_by, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    tripPlanId || null,
    supplierId || null,
    type,
    title,
    status || 'Pending',
    sqlDate(date),
    amount ?? '',
    location || '',
    details || '',
    createdBy || null,
    updatedBy || null,
    now,
    now
  );
  return findById(id);
}

function createLegacy({ type, title, status, date, amount, location, details }) {
  const id = `booking-${Date.now()}`;
  const now = sqlNow();
  db.prepare(`
    INSERT INTO bookings (id, type, title, status, date, amount, location, details, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, type, title, status || 'Pending', sqlDate(date), amount || '', location || '', details || '', now, now);
  return findById(id);
}

function updateStatus(id, status) {
  const now = sqlNow();
  db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  return findById(id);
}

function remove(id) {
  return db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
}

module.exports = { listAll, findById, create, createLegacy, updateStatus, remove };
