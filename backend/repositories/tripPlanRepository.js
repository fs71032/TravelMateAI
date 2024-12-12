const { db } = require('../db');
const { normalizeTimestamp, normalizeDate, sqlNow } = require('../utils/dateFormat');
const { resolveUserId, resolveUserEmail } = require('../utils/userResolve');
const { findOrCreateDestination, getDestinationName } = require('../utils/destinationResolve');

function loadItineraryItems(tripPlanId) {
  return db
    .prepare(
      `SELECT id, day, title, details, order_index
       FROM itinerary_items
       WHERE trip_plan_id = ?
       ORDER BY day, order_index`
    )
    .all(tripPlanId)
    .map((row) => ({
      id: row.id,
      day: row.day,
      title: row.title,
      details: row.details || '',
      orderIndex: row.order_index
    }));
}

function syncItineraryItems(tripPlanId, items, actorUserId = null) {
  db.prepare('DELETE FROM itinerary_items WHERE trip_plan_id = ?').run(tripPlanId);

  if (!Array.isArray(items) || items.length === 0) return;

  const insert = db.prepare(`
    INSERT INTO itinerary_items (id, trip_plan_id, day, title, details, order_index, created_by, updated_by, created_at, updated_at)
    VALUES (@id, @trip_plan_id, @day, @title, @details, @order_index, @created_by, @updated_by, @created_at, @updated_at)
  `);

  const now = sqlNow();
  const tx = db.transaction((rows) => {
    rows.forEach((item, index) => {
      insert.run({
        id: item.id || `item-${tripPlanId}-${index + 1}`,
        trip_plan_id: tripPlanId,
        day: Number(item.day) || index + 1,
        title: item.title || `Day ${index + 1}`,
        details: item.details || null,
        order_index: index,
        created_by: actorUserId,
        updated_by: actorUserId,
        created_at: now,
        updated_at: now
      });
    });
  });
  tx(items);

  db.prepare(`
    UPDATE trip_plans_fts
    SET items_text = COALESCE((
      SELECT group_concat(title || ' ' || COALESCE(details, ''), ' ')
      FROM itinerary_items
      WHERE trip_plan_id = ?
    ), '')
    WHERE id = ?
  `).run(tripPlanId, tripPlanId);
}

function rowToPlan(row) {
  return {
    id: row.id,
    name: row.name,
    destination: getDestinationName(row.destination_id),
    days: row.days,
    style: row.style,
    budget: row.budget || '',
    customPrompt: row.custom_prompt || '',
    source: row.source || undefined,
    items: loadItineraryItems(row.id),
    updatedAt: row.updated_at,
    userEmail: resolveUserEmail(row.user_id) || undefined,
    userId: row.user_id || undefined,
    plannedDate: row.planned_date || undefined
  };
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function listPlans(userEmail) {
  const userId = resolveUserId(userEmail);
  const rows = userId
    ? db
        .prepare(
          `SELECT * FROM trip_plans
           WHERE user_id = ?
           ORDER BY datetime(COALESCE(planned_date, updated_at)) DESC`
        )
        .all(userId)
    : db.prepare('SELECT * FROM trip_plans ORDER BY datetime(updated_at) DESC').all();
  return rows.map(rowToPlan);
}

function upsertPlan(plan) {
  const userId = plan.userId || resolveUserId(plan.userEmail);
  const actorUserId = userId || plan.createdBy || null;
  const destinationId = plan.destinationId || findOrCreateDestination(plan.destination, actorUserId);
  const now = sqlNow();

  const record = {
    id: plan.id || `plan-${Date.now()}`,
    name: plan.name || `${plan.destination} trip`,
    destination_id: destinationId,
    days: Number(plan.days) || (Array.isArray(plan.items) ? plan.items.length : 1),
    style: plan.style || 'Balanced',
    budget: plan.budget || '',
    custom_prompt: plan.customPrompt || '',
    source: plan.source || null,
    user_id: userId,
    planned_date: normalizeDate(plan.plannedDate),
    created_by: plan.createdBy || actorUserId,
    updated_by: plan.updatedBy || actorUserId,
    updated_at: normalizeTimestamp(plan.updatedAt) || now,
    created_at: normalizeTimestamp(plan.createdAt) || now
  };

  db.prepare(`
    INSERT INTO trip_plans (
      id, name, destination_id, days, style, budget, custom_prompt, source,
      user_id, planned_date, created_by, updated_by, created_at, updated_at
    )
    VALUES (
      @id, @name, @destination_id, @days, @style, @budget, @custom_prompt, @source,
      @user_id, @planned_date, @created_by, @updated_by, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      destination_id = excluded.destination_id,
      days = excluded.days,
      style = excluded.style,
      budget = excluded.budget,
      custom_prompt = excluded.custom_prompt,
      source = excluded.source,
      user_id = excluded.user_id,
      planned_date = excluded.planned_date,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(record);

  syncItineraryItems(record.id, plan.items || [], actorUserId);

  db.prepare(`
    UPDATE trip_plans_fts
    SET destination = COALESCE((SELECT name FROM destinations WHERE id = ?), '')
    WHERE id = ?
  `).run(destinationId, record.id);

  return rowToPlan(db.prepare('SELECT * FROM trip_plans WHERE id = ?').get(record.id));
}

function deletePlan(id) {
  const result = db.prepare('DELETE FROM trip_plans WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = { listPlans, upsertPlan, deletePlan, loadItineraryItems, syncItineraryItems };
