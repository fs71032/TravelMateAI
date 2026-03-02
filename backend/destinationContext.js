const { db } = require('./db');

function normalizeDestinationKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lookupDestinationFromDb(destination) {
  const trimmed = String(destination || '').trim();
  if (!trimmed) return null;

  const exact = db
    .prepare(
      `SELECT name, location, category, price, rating, description
       FROM destinations
       WHERE lower(name) = lower(?)
       LIMIT 1`
    )
    .get(trimmed);

  if (exact) return exact;

  const fuzzy = db
    .prepare(
      `SELECT name, location, category, price, rating, description
       FROM destinations
       WHERE lower(name) LIKE lower(?) OR lower(location) LIKE lower(?)
       ORDER BY length(name) ASC
       LIMIT 1`
    )
    .get(`%${trimmed}%`, `%${trimmed}%`);

  return fuzzy || null;
}

function formatDestinationContext(destination, dbRow) {
  if (!dbRow) return '';

  return [
    'Known destination profile:',
    `- Name: ${dbRow.name}`,
    dbRow.location ? `- Region: ${dbRow.location}` : '',
    dbRow.category ? `- Category: ${dbRow.category}` : '',
    dbRow.price ? `- Typical package price: ${dbRow.price}` : '',
    dbRow.rating ? `- Rating: ${dbRow.rating}/5` : '',
    dbRow.description ? `- Highlights: ${dbRow.description}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

function resolveDestinationContext(destination) {
  const dbRow = lookupDestinationFromDb(destination);
  return {
    dbRow,
    contextBlock: formatDestinationContext(destination, dbRow)
  };
}

module.exports = {
  normalizeDestinationKey,
  lookupDestinationFromDb,
  resolveDestinationContext
};
