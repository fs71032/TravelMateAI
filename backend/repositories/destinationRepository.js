const { db } = require('../db');
const { sqlNow } = require('../utils/dateFormat');

const CANONICAL_DESTINATIONS = [
  {
    id: 'dest-1',
    name: 'Lisbon, Portugal',
    location: 'Portugal',
    category: 'City & Culture',
    price: '€820',
    rating: 4.9,
    description: 'Historic streets, rooftop bars, and riverside cafés for a premium city escape.'
  },
  {
    id: 'dest-2',
    name: 'Reykjavík, Iceland',
    location: 'Iceland',
    category: 'Adventure',
    price: '€1,150',
    rating: 4.8,
    description: 'Northern lights, glacier tours, and volcanic landscapes for the adventurous group.'
  },
  {
    id: 'dest-3',
    name: 'Amalfi Coast',
    location: 'Italy',
    category: 'Luxury',
    price: '€980',
    rating: 4.9,
    description: 'Coastal villas, sunset cruises, and gourmet dining along the Italian seaside.'
  }
];

function createDestinationsTable() {
  db.exec(`
    CREATE TABLE destinations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT,
      price TEXT,
      rating REAL,
      description TEXT,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_destinations_location ON destinations(location)');
}

function migrateDestinationsTable() {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='destinations'")
    .get();

  if (!table) {
    createDestinationsTable();
  }
}

function syncDestinations() {
  migrateDestinationsTable();

  const now = sqlNow();
  const insert = db.prepare(`
    INSERT INTO destinations (
      id, name, location, category, price, rating, description,
      created_at, updated_at
    )
    VALUES (
      @id, @name, @location, @category, @price, @rating, @description,
      @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      location = excluded.location,
      category = excluded.category,
      price = excluded.price,
      rating = excluded.rating,
      description = excluded.description,
      updated_at = excluded.updated_at
  `);

  const tx = db.transaction((rows) => {
    for (const row of rows) {
      insert.run({ ...row, created_at: now, updated_at: now });
    }
  });
  tx(CANONICAL_DESTINATIONS);

  const keepIds = CANONICAL_DESTINATIONS.map((d) => d.id);
  db.prepare(`DELETE FROM destinations WHERE id NOT IN (${keepIds.map(() => '?').join(', ')})`).run(...keepIds);
}

function rowToDestination(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    rating: row.rating,
    category: row.category,
    price: row.price,
    description: row.description || ''
  };
}

function listDestinations() {
  syncDestinations();
  const rows = db.prepare('SELECT * FROM destinations ORDER BY name COLLATE NOCASE').all();
  return rows.map(rowToDestination);
}

module.exports = {
  listDestinations,
  syncDestinations,
  CANONICAL_DESTINATIONS
};
