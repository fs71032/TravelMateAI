const { db, dbPath } = require('../db');

console.log('Database:', dbPath);

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      target_table TEXT NOT NULL,
      target_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).run();
  console.log('Ensured table: reviews');
} catch (err) {
  console.error('Failed to ensure reviews:', err.message || err);
}

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_table TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).run();
  console.log('Ensured table: favorites');
} catch (err) {
  console.error('Failed to ensure favorites:', err.message || err);
}

try {
  db.prepare('CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)').run();
  console.log('Ensured indexes for reviews and favorites');
} catch (err) {
  console.error('Failed to create indexes:', err.message || err);
}

console.log('Done.');
