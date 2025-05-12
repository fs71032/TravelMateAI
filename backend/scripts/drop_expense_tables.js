const { db, dbPath } = require('../db');

console.log('Database:', dbPath);

try {
  db.prepare('DROP TABLE IF EXISTS expenses').run();
  console.log('Dropped table: expenses');
} catch (err) {
  console.error('Failed to drop expenses:', err.message || err);
}

try {
  db.prepare('DROP TABLE IF EXISTS expense_categories').run();
  console.log('Dropped table: expense_categories');
} catch (err) {
  console.error('Failed to drop expense_categories:', err.message || err);
}

console.log('Done.');
