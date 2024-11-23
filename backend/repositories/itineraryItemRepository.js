const { db } = require('../db');
const { generateId } = require('../utils/ids');

function list(tripPlanId) {
  if (tripPlanId) {
    return db.prepare('SELECT * FROM itinerary_items WHERE trip_plan_id = ? ORDER BY day, order_index').all(tripPlanId);
  }
  return db.prepare('SELECT * FROM itinerary_items ORDER BY trip_plan_id, day, order_index').all();
}

function findById(id) {
  return db.prepare('SELECT * FROM itinerary_items WHERE id = ?').get(id);
}

function create({ tripPlanId, day, title, details, orderIndex }) {
  const id = generateId('item');
  db.prepare(
    'INSERT INTO itinerary_items (id, trip_plan_id, day, title, details, order_index) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, tripPlanId, day, title.trim(), details || null, Number.isFinite(orderIndex) ? orderIndex : 0);
  return findById(id);
}

function update(id, fields) {
  const updates = [];
  const params = [];
  if (typeof fields.day === 'number') {
    updates.push('day = ?');
    params.push(fields.day);
  }
  if (typeof fields.title === 'string') {
    updates.push('title = ?');
    params.push(fields.title.trim());
  }
  if (typeof fields.details === 'string') {
    updates.push('details = ?');
    params.push(fields.details);
  }
  if (typeof fields.orderIndex === 'number') {
    updates.push('order_index = ?');
    params.push(fields.orderIndex);
  }
  if (updates.length === 0) return findById(id);
  params.push(id);
  db.prepare(`UPDATE itinerary_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return findById(id);
}

function remove(id) {
  return db.prepare('DELETE FROM itinerary_items WHERE id = ?').run(id);
}

module.exports = { list, findById, create, update, remove };
