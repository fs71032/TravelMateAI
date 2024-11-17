const { db } = require('../db');

const EXPORT_TABLES = ['destinations', 'trip_plans', 'bookings', 'messages', 'users'];

function exportAll(table) {
  return db.prepare(`SELECT * FROM ${table}`).all();
}

function importDestination(row, id) {
  db.prepare('INSERT OR IGNORE INTO destinations (id, name, location, category, price, rating, description) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, row.name || 'Unknown', row.location || '', row.category || null, row.price || null, row.rating || null, row.description || null
  );
}

function importTripPlan(row, id, destinationId, userId) {
  db.prepare(`
    INSERT OR IGNORE INTO trip_plans (id, name, destination_id, days, style, budget, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, row.name || 'Plan', destinationId, row.days || 1, row.style || 'Balanced', row.budget || '', userId || null);
}

function importBooking(row, id) {
  db.prepare('INSERT OR IGNORE INTO bookings (id, trip_plan_id, supplier_id, type, title, status, date, amount, location, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, row.trip_plan_id || null, row.supplier_id || null, row.type || 'Other', row.title || '', row.status || 'Pending', row.date || null, row.amount || null, row.location || null, row.details || null
  );
}

function importUser(row, id) {
  db.prepare('INSERT OR IGNORE INTO users (id, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?)').run(
    id, row.first_name || row.name || 'User', row.last_name || '', row.email || `user+${id}@example.com`, row.password_hash || row.password || 'changeme'
  );
}

function runImportTransaction(callback) {
  return db.transaction(callback);
}

module.exports = {
  EXPORT_TABLES,
  exportAll,
  importDestination,
  importTripPlan,
  importBooking,
  importUser,
  runImportTransaction
};
