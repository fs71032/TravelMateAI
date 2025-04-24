const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'travelmate.db');

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

function getTableColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
}

function updateTable(table, requiredColumns) {
  const columns = getTableColumns(table);
  const updatable = requiredColumns.filter((col) => columns.includes(col));
  if (!updatable.length) {
    console.log(`Skipping ${table}: no audit columns available to update.`);
    return;
  }

  const selectColumns = ['id'];
  if (columns.includes('created_at')) selectColumns.push('created_at');
  if (columns.includes('updated_at')) selectColumns.push('updated_at');
  const rows = db.prepare(`SELECT ${selectColumns.join(', ')} FROM ${table}`).all();

  const updateFields = updatable.map((col) => `${col} = COALESCE(${col}, @${col})`);
  const stmt = db.prepare(`UPDATE ${table} SET ${updateFields.join(', ')} WHERE id = @id`);

  db.transaction(() => {
    for (const row of rows) {
      const params = { id: row.id };
      updatable.forEach((col) => {
        if (row[col] !== undefined && row[col] !== null) {
          params[col] = row[col];
          return;
        }

        if (col === 'created_at' || col === 'updated_at') {
          params[col] = row.updated_at || row.created_at || new Date().toISOString();
        } else {
          params[col] = null;
        }
      });
      stmt.run(params);
    }
  })();

  console.log(`Updated ${rows.length} rows in ${table}`);
}

const tables = {
  users: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  permissions: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  roles: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  settings: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  refresh_tokens: ['created_by', 'updated_by', 'updated_at'],
  role_permissions: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  user_roles: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  chat_rooms: ['created_by', 'updated_by', 'updated_at'],
  messages: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  destinations: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  guides: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  travel_groups: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  booking_suppliers: ['created_by', 'updated_by', 'updated_at'],
  trip_plans: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  itinerary_items: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  bookings: ['created_by', 'updated_by', 'updated_at'],
  invoices: ['created_by', 'updated_by', 'updated_at'],
  payments: ['created_by', 'updated_by', 'updated_at'],
  files: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  reviews: ['created_by', 'updated_by', 'updated_at'],
  favorites: ['created_by', 'updated_by', 'updated_at'],
  group_members: ['created_by', 'updated_by', 'created_at', 'updated_at'],
  notifications: ['created_by', 'updated_by', 'created_at', 'updated_at']
};

db.pragma('foreign_keys = OFF');
for (const [table, cols] of Object.entries(tables)) {
  try {
    updateTable(table, cols);
  } catch (error) {
    console.error(`Failed to update ${table}:`, error.message || error);
  }
}
db.pragma('foreign_keys = ON');

console.log('Audit field backfill complete.');
