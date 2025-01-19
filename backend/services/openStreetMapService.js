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
  if (!name) return null;

  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const addressParts = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
    .filter(Boolean)
    .join(' ');

  const primaryType = tags.tourism || tags.amenity || tags.historic || tags.leisure || tags.natural || 'place';
  const mapsUrl =
    lat != null && lon != null
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`
      : '';

  return {
    name,
    address: tags['addr:full'] || addressParts || '',
    rating: null,
    reviewCount: null,
    primaryType,
    types: [tags.tourism, tags.amenity, tags.historic, tags.leisure, tags.natural].filter(Boolean),
    mapsUrl,
    summary: tags.description || (tags.wikipedia ? `Wikipedia: ${tags.wikipedia}` : '')
  };
}

async function queryOverpass(lat, lon, style, radiusMeters = 9000) {
  const filters = styleTagFilters(style);
  const blocks = filters
    .map(
      (filter) =>
        `  node${filter}(around:${radiusMeters},${lat},${lon});\n  way${filter}(around:${radiusMeters},${lat},${lon});`
    )
    .join('\n');

  const query = `[out:json][timeout:25];
(
${blocks}
);
out center 50;`;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT
    },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!response.ok) {
    throw new Error(`Overpass query failed (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data.elements) ? data.elements : [];
}

async function fetchDestinationPlaces({ destination, style, days = 3 }) {
  const trimmed = String(destination || '').trim();
  if (!trimmed || !isOpenStreetMapEnabled()) {
    return [];
  }

  const cacheKey = `osm|${trimmed.toLowerCase()}|${style}|${days}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.places;
  }

  const geo = await geocodeDestination(trimmed);
  const elements = await queryOverpass(geo.lat, geo.lon, style);
  const merged = [];
  const seen = new Set();

  for (const element of elements) {
    const place = normalizeOsmElement(element);
    if (!place) continue;
    const key = place.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(place);
  }

  CACHE.set(cacheKey, { at: Date.now(), places: merged });
  return merged;
}

module.exports = {
  isOpenStreetMapEnabled,
  fetchDestinationPlaces,
  geocodeDestination
};
