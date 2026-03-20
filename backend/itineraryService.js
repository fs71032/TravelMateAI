const { generateWithOpenAI } = require('./itineraryAi');
const { isOpenAiConfigured } = require('./utils/openAiConfig');
const { getVariantTitle, getVariantDetails } = require('./itineraryVariations');
const { resolveDestinationContext } = require('./destinationContext');
const { generateProfileItinerary, profilePromptHints } = require('./destinationProfiles');
const {
  isLivePlacesEnabled,
  isGooglePlacesConfigured,
  isOpenStreetMapEnabled,
  fetchDestinationPlaces,
  buildItineraryFromPlaces,
  formatPlacesForPrompt
} = require('./services/placesService');

const getStyleDescription = (style) => {
  const normalized = (style || '').trim().toLowerCase();
  if (normalized.includes('relax') || normalized.includes('chill')) {
    return 'a relaxed schedule with spa, beach time, and slow city walks';
  }
  if (normalized.includes('adventure') || normalized.includes('active')) {
    return 'an action-packed route with outdoor adventure, hiking, and discovery';
  }
  if (normalized.includes('culture') || normalized.includes('local')) {
    return 'a cultural itinerary focusing on museums, markets, and heritage sites';
  }
  if (normalized.includes('food') || normalized.includes('culinary')) {
    return 'a food-focused route with local restaurants, markets, and tasting experiences';
  }
  if (normalized.includes('family')) {
    return 'a family-friendly plan with shorter transfers and activities for mixed ages';
  }
  return 'a balanced trip with highlights, dining, and downtime';
};

const getDayTitle = (dayNumber) => `Day ${dayNumber}: Highlights & local discovery`;

function buildItineraryPrompt({ destination, days, style, budget, customPrompt, seed, placesContext }) {
  const dest = (destination || '').trim() || 'the destination';
  const travelStyle = (style || '').trim() || 'balanced';
  const dayCount = Number.isInteger(days) ? Math.max(1, Math.min(days, 7)) : 3;
  const budgetLine = (budget || '').trim() ? `Total budget guideline: ${budget.trim()}. Split costs per day.` : '';
  const extra = (customPrompt || '').trim() ? `Guest requirements: ${customPrompt.trim()}` : '';
  const regenerateLine =
    seed != null
      ? `Regeneration id ${seed}: create a distinctly different route — other neighborhoods, restaurants, and pacing.`
      : '';

  const profileHints = profilePromptHints(dest);
  const { contextBlock } = resolveDestinationContext(dest);

  return [
    `Plan a ${dayCount}-day ${travelStyle.toLowerCase()} trip to ${dest}.`,
    contextBlock,
    profileHints,
    placesContext,
    budgetLine,
    extra,
    regenerateLine,
    '',
    'Output requirements per day:',
    '- title: short theme with real district or landmark names',
    '- details: timed schedule (09:00–11:00 format) with real venue names, addresses, lunch/dinner spots, and one local tip',
    '- minimize backtracking; group sights by area',
    '- use realistic opening hours and walking/transit times',
    '',
    'The itinerary must read like a professional local guide backed by verified place data.'
  ]
    .filter(Boolean)
    .join('\n');
}

function normalizeRequest({ destination, days, style, budget, customPrompt, seed }) {
  const safeDestination = typeof destination === 'string' ? destination.trim() : '';
  const safeStyle = typeof style === 'string' ? style.trim() : 'Balanced';
  const safeBudget = typeof budget === 'string' ? budget.trim() : '';
  const safeCustomPrompt = typeof customPrompt === 'string' ? customPrompt.trim() : '';
  const safeDays = Number.isInteger(days) ? Math.max(1, Math.min(days, 7)) : 3;
  const safeSeed = typeof seed === 'number' && Number.isFinite(seed) ? seed : undefined;

  return {
    destination: safeDestination,
    days: safeDays,
    style: safeStyle,
    budget: safeBudget,
    customPrompt: safeCustomPrompt,
    seed: safeSeed
  };
}

function generateTemplateItinerary(request) {
  const profileResult = generateProfileItinerary(request);
  if (profileResult) {
    return {
      prompt: buildItineraryPrompt({ ...request, placesContext: '' }),
      items: profileResult.items,
      profileLabel: profileResult.profile.label
    };
  }

  const stamp = request.seed || Date.now();
  const items = Array.from({ length: request.days }, (_, index) => {
    const dayNumber = index + 1;
    const styleDesc = getStyleDescription(request.style);
    const budgetNote = request.budget ? ` Budget target: ${request.budget}.` : '';
    const focusNote = request.customPrompt ? ` Guest request: ${request.customPrompt}.` : '';

    return {
      id: `ai-${stamp}-${dayNumber}`,
      day: dayNumber,
      title: request.seed != null ? getVariantTitle(dayNumber, request.seed) : getDayTitle(dayNumber),
      details: getVariantDetails({
        day: dayNumber,
        destination: request.destination,
        styleDesc,
        budgetNote,
        focusNote,
        seed: request.seed
      })
    };
  });

  return {
    prompt: buildItineraryPrompt({ ...request, placesContext: '' }),
    items
  };
}

function normalizeItineraryItems(items) {
  return items.map((item, index) => ({
    ...item,
    day: item.day ?? index + 1,
    title: item.title ?? '',