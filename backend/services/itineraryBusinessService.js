const {
  generateItinerary,
  generateTemplateItinerary,
  isAiConfigured,
  isGooglePlacesConfigured,
  isLivePlacesEnabled,
  isOpenStreetMapEnabled
} = require('../itineraryService');
const { isOpenAiConfigured } = require('../utils/openAiConfig');
const tripPlanRepository = require('../repositories/tripPlanRepository');
const notificationRepository = require('../repositories/notificationRepository');
const itineraryItemRepository = require('../repositories/itineraryItemRepository');
const entityRepository = require('../repositories/entityRepository');
const auditService = require('./auditService');
const { sqlNow } = require('../utils/dateFormat');
const { emitNotification } = require('../utils/socketEmitter');

function getStatus() {
  return {
    data: {
      aiEnabled: isAiConfigured(),
      livePlacesEnabled: isLivePlacesEnabled(),
      openStreetMapEnabled: isOpenStreetMapEnabled(),
      googlePlacesEnabled: isGooglePlacesConfigured(),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    }
  };
}

function listPlans(userEmail) {
  return { data: tripPlanRepository.listPlans(typeof userEmail === 'string' ? userEmail : undefined) };
}

function savePlan(body) {
  if (!body.destination || !Array.isArray(body.items)) {
    return { error: { status: 400, message: 'Invalid trip plan payload.' } };
  }
  const plan = tripPlanRepository.upsertPlan({
    id: body.id || `plan-${Date.now()}`,
    name: body.name || `${body.destination} trip`,
    destination: String(body.destination).trim(),
    days: Number(body.days) || body.items.length,
    style: body.style || 'Balanced',
    budget: body.budget || '',
    customPrompt: body.customPrompt || '',
    items: body.items,
    source: body.source,
    userEmail: body.userEmail || null,
    plannedDate: body.plannedDate || null,
    updatedAt: body.updatedAt ? sqlNow(body.updatedAt) : sqlNow()
  });
  const notification = notificationRepository.createNotification({
    type: 'trip',
    title: 'Trip plan saved',
    message: `The plan for ${plan.destination} has been updated in your account.`,
    userEmail: plan.userEmail || null
  });
  emitNotification(notification);
  return { data: plan };
}

function deletePlan(id) {
  const removed = tripPlanRepository.deletePlan(id);
  if (!removed) return { error: { status: 404, message: 'Trip plan not found.' } };
  return { status: 204 };
}

function getPlanById(id) {
  const plan = entityRepository.findById('trip_plans', id);
  if (!plan) return { error: { status: 404, message: 'Trip plan not found.' } };
  return { data: plan };
}

function listItems(tripPlanId) {
  return { data: itineraryItemRepository.list(tripPlanId) };
}

function createItem(body) {
  const { tripPlanId, day, title, details, orderIndex } = body || {};
  if (!tripPlanId || typeof day !== 'number' || !title) {
    return { error: { status: 400, message: 'tripPlanId, day, and title are required.' } };
  }
  const item = itineraryItemRepository.create({ tripPlanId, day, title, details, orderIndex });
  auditService.logAction({ action: 'create', tableName: 'itinerary_items', recordId: item.id, details: item });
  return { data: item, status: 201 };
}

function updateItem(id, body) {
  const item = itineraryItemRepository.findById(id);
  if (!item) return { error: { status: 404, message: 'Itinerary item not found.' } };

  const hasField =
    typeof body.day === 'number' ||
    typeof body.title === 'string' ||
    typeof body.details === 'string' ||
    typeof body.orderIndex === 'number';
  if (!hasField) {
    return { error: { status: 400, message: 'No valid fields to update.' } };
  }

  const updated = itineraryItemRepository.update(id, {
    day: body.day,
    title: body.title,
    details: body.details,
    orderIndex: body.orderIndex
  });
  auditService.logAction({ action: 'update', tableName: 'itinerary_items', recordId: id, details: updated });
  return { data: updated };
}

function deleteItem(id) {
  const result = itineraryItemRepository.remove(id);
  if (result.changes === 0) return { error: { status: 404, message: 'Itinerary item not found.' } };
  auditService.logAction({ action: 'delete', tableName: 'itinerary_items', recordId: id });