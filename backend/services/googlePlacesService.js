const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const CACHE = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

const RESTAURANT_TYPES = new Set([
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'meal_delivery',
  'meal_takeaway',
  'food'
]);

const PLACEHOLDER_KEYS = ['your-key', 'your_key', 'changeme', 'example'];

function getApiKey() {
  return (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim();
}

function isGooglePlacesConfigured() {
  const key = getApiKey();
  if (!key) return false;
  const lower = key.toLowerCase();
  return !PLACEHOLDER_KEYS.some((token) => lower.includes(token));
}

function styleQueries(destination, style) {
  const dest = destination.trim();
  const normalized = (style || 'Balanced').trim().toLowerCase();

  if (normalized.includes('food')) {
    return [
      `best restaurants in ${dest}`,
      `local food market ${dest}`,
      `cafes and bakeries ${dest}`,
      `fine dining ${dest}`
    ];
  }
  if (normalized.includes('culture')) {
    return [
      `museums in ${dest}`,
      `historic landmarks ${dest}`,
      `art galleries ${dest}`,
      `UNESCO sites near ${dest}`
    ];
  }
  if (normalized.includes('adventure')) {
    return [
      `outdoor activities ${dest}`,
      `hiking trails near ${dest}`,
      `adventure tours ${dest}`,
      `national parks near ${dest}`
    ];
  }
  if (normalized.includes('relax')) {
    return [
      `parks and gardens ${dest}`,
      `spas ${dest}`,
      `scenic viewpoints ${dest}`,
      `beaches near ${dest}`
    ];
  }
  if (normalized.includes('family')) {
    return [
      `family friendly attractions ${dest}`,
      `zoos aquariums ${dest}`,
      `parks ${dest}`,
      `kid friendly restaurants ${dest}`
    ];
  }

  return [
    `top tourist attractions in ${dest}`,
    `best restaurants in ${dest}`,
    `things to do ${dest}`,
    `viewpoints ${dest}`
  ];
}

function normalizePlace(raw) {
  const name = raw.displayName?.text || '';
  if (!name) return null;

  return {
    name,
    address: raw.formattedAddress || '',
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    reviewCount: typeof raw.userRatingCount === 'number' ? raw.userRatingCount : null,
    primaryType: raw.primaryType || '',
    types: Array.isArray(raw.types) ? raw.types : [],
    mapsUrl: raw.googleMapsUri || '',
    summary: raw.editorialSummary?.text || ''
  };
}

async function searchPlaces(textQuery) {
  const apiKey = getApiKey();
  const response = await fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.displayName',
        'places.formattedAddress',
        'places.rating',
        'places.userRatingCount',
        'places.primaryType',
        'places.types',
        'places.googleMapsUri',
        'places.editorialSummary'
      ].join(',')
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 8,
      languageCode: 'en'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  return (data.places || [])
    .map(normalizePlace)
    .filter(Boolean);
}

async function fetchDestinationPlaces({ destination, style, days = 3 }) {
  const trimmed = String(destination || '').trim();
  if (!trimmed || !isGooglePlacesConfigured()) {
    return [];
  }

  const cacheKey = `${trimmed.toLowerCase()}|${style}|${days}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.places;
  }

  const queries = styleQueries(trimmed, style);
  const merged = [];
  const seen = new Set();

  for (const query of queries) {
    try {
      const batch = await searchPlaces(query);
      for (const place of batch) {
        const key = place.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(place);
      }
    } catch (error) {
      console.error('[google-places]', query, error.message);
    }
  }

  merged.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  CACHE.set(cacheKey, { at: Date.now(), places: merged });
  return merged;
}

module.exports = {
  isGooglePlacesConfigured,
  fetchDestinationPlaces
};
