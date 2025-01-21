const RESTAURANT_TYPES = new Set([
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'fast_food',
  'food',
  'meal_takeaway',
  'marketplace'
]);

function isRestaurant(place) {
  if (RESTAURANT_TYPES.has(place.primaryType)) return true;
  return place.types.some((type) => RESTAURANT_TYPES.has(type));
}

function pickFromPool(pool, index, seed = 0) {
  if (!pool.length) return null;
  const offset = Math.abs(Math.floor(seed / 1000) + index) % pool.length;
  return pool[offset];
}

function formatPlaceLine(prefix, place) {
  if (!place) return null;
  const rating = place.rating ? ` ★${place.rating}` : '';
  const maps = place.mapsUrl ? `\n   Maps: ${place.mapsUrl}` : '';
  return `${prefix} — ${place.name}${place.address ? ` (${place.address})` : ''}${rating}${maps}`;
}

function buildItineraryFromPlaces(request, places) {
  if (!places.length) return [];

  const attractions = places.filter((place) => !isRestaurant(place));
  const restaurants = places.filter(isRestaurant);
  const activityPool = attractions.length ? attractions : places;
  const foodPool = restaurants.length ? restaurants : places;
  const stamp = request.seed || Date.now();

  return Array.from({ length: request.days }, (_, index) => {
    const day = index + 1;
    const morning = pickFromPool(activityPool, day * 2, stamp);
    const afternoon = pickFromPool(activityPool, day * 2 + 1, stamp);
    const lunch = pickFromPool(foodPool, day * 2, stamp + 17);
    const dinner = pickFromPool(foodPool, day * 2 + 1, stamp + 29);

    const lines = [
      formatPlaceLine('09:30–12:00', morning),
      formatPlaceLine('12:30–14:00 — Lunch', lunch),
      afternoon && afternoon.name !== morning?.name
        ? formatPlaceLine('15:00–17:30', afternoon)
        : null,
      formatPlaceLine('19:30 — Dinner', dinner),
      'Local tip: Confirm opening hours on the map link before visiting.'
    ].filter(Boolean);

    const headline = morning?.name || request.destination;
    return {
      id: `live-${stamp}-${day}`,
      day,
      title: `Day ${day}: ${headline} & nearby highlights`,
      details: lines.join('\n')
    };
  });
}

function formatPlacesForPrompt(places, providerLabel = 'OpenStreetMap') {
  if (!places.length) return '';

  const lines = places.slice(0, 30).map((place) => {
    const rating = place.rating ? ` ★${place.rating}` : '';
    const type = place.primaryType || place.types[0] || 'place';
    const summary = place.summary ? ` — ${place.summary}` : '';
    const address = place.address ? ` @ ${place.address}` : '';
    return `- ${place.name}${rating} (${type})${address}${summary}`;
  });

  return [
    `VERIFIED LIVE PLACES (${providerLabel}) — build the itinerary using these real venues:`,
    ...lines,
    '',
    'Cluster by neighborhood, include map links, and use realistic timing between stops.'
  ].join('\n');
}

module.exports = {
  isRestaurant,
  buildItineraryFromPlaces,
  formatPlacesForPrompt
};
