const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'TravelMateAI/1.0 (travel-planner; academic-project)';
const CACHE = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

function isOpenStreetMapEnabled() {
  return process.env.OSM_PLACES_ENABLED !== 'false';
}

function styleTagFilters(style) {
  const normalized = (style || 'Balanced').trim().toLowerCase();

  if (normalized.includes('food')) {
    return [
      '["amenity"="restaurant"]',
      '["amenity"="cafe"]',
      '["amenity"="fast_food"]',
      '["shop"="bakery"]',
      '["amenity"="marketplace"]'
    ];
  }
  if (normalized.includes('culture')) {
    return [
      '["tourism"="museum"]',
      '["tourism"="gallery"]',
      '["tourism"="artwork"]',
      '["historic"]',
      '["amenity"="arts_centre"]'
    ];
  }
  if (normalized.includes('adventure')) {
    return [
      '["tourism"="viewpoint"]',
      '["natural"]',
      '["leisure"="park"]',
      '["sport"]'
    ];
  }
  if (normalized.includes('relax')) {
    return [
      '["leisure"="park"]',
      '["leisure"="garden"]',
      '["natural"="beach"]',
      '["amenity"="spa"]'
    ];
  }
  if (normalized.includes('family')) {
    return [
      '["tourism"="zoo"]',
      '["tourism"="aquarium"]',
      '["leisure"="playground"]',
      '["tourism"="theme_park"]'
    ];
  }

  return [
    '["tourism"="attraction"]',
    '["tourism"="museum"]',
    '["historic"]',
    '["amenity"="restaurant"]',
    '["amenity"="cafe"]',
    '["tourism"="viewpoint"]'
  ];
}

async function geocodeDestination(destination) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(destination)}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim geocode failed (${response.status})`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || !results.length) {
    throw new Error(`Could not geocode destination: ${destination}`);
  }

  const hit = results[0];
  return {
    lat: Number.parseFloat(hit.lat),
    lon: Number.parseFloat(hit.lon),
    displayName: hit.display_name
  };
}

function normalizeOsmElement(element) {
  const tags = element.tags || {};
  const name = tags.name || tags['name:en'] || tags['name:sq'] || tags['name:it'];