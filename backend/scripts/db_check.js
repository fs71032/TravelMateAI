const { db, dbPath } = require('../db');

const tables = [
  'users',
  'permissions',
  'roles',
  'settings',
  'refresh_tokens',
  'role_permissions',
  'user_roles',
  'chat_rooms',
  'messages',
  'destinations',
  'guides',
  'travel_groups',
  'group_members',
  'booking_suppliers',
  'trip_plans',
  'itinerary_items',
  'bookings',
  'invoices',
  'payments',
  // expense tables removed
  'files',
  'reviews',
  'favorites',
  'notifications',
  'audit_logs'
];

console.log('Database:', dbPath);
console.log('---');

for (const table of tables) {
  const count = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
  console.log(`${table}: ${count} row(s)`);
}

const allTables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => row.name);

console.log('\nTables in database:', allTables.join(', '));
console.log('\nDatabase check OK');
