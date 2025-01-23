const {
  isGooglePlacesConfigured,
  fetchDestinationPlaces: fetchGooglePlaces
} = require('./googlePlacesService');
const {
  isOpenStreetMapEnabled,
  fetchDestinationPlaces: fetchOsmPlaces
} = require('./openStreetMapService');
const {
  buildItineraryFromPlaces,
  formatPlacesForPrompt
} = require('./placeItineraryBuilder');

function isLivePlacesEnabled() {
  return isOpenStreetMapEnabled() || isGooglePlacesConfigured();
}

function mergePlaces(primary, secondary) {
  const merged = [...primary];
  const seen = new Set(primary.map((place) => place.name.toLowerCase()));

  for (const place of secondary) {
    const key = place.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(place);
  }

  return merged;
}

async function fetchDestinationPlaces(request) {
  let places = [];
  let provider = '';

  if (isOpenStreetMapEnabled()) {
    try {
      places = await fetchOsmPlaces(request);
      provider = 'OpenStreetMap';
    } catch (error) {
      console.error('[places] OpenStreetMap failed:', error.message);
    }
  }

  if (isGooglePlacesConfigured()) {
    try {
      const googlePlaces = await fetchGooglePlaces(request);
      places = mergePlaces(places, googlePlaces);
      provider = places.length && googlePlaces.length ? 'OpenStreetMap + Google' : provider || 'Google Maps';
    } catch (error) {
      console.error('[places] Google Places failed:', error.message);
    }
  }

  return { places, provider: provider || 'live data' };
}

module.exports = {
  isLivePlacesEnabled,
  isGooglePlacesConfigured,
  isOpenStreetMapEnabled,
  fetchDestinationPlaces,
  buildItineraryFromPlaces,
  formatPlacesForPrompt
};
