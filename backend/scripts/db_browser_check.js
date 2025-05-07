const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'travelmate.db');
const db = new Database(dbPath, { readonly: true });

const AUDIT_COLS = ['created_by', 'updated_by', 'created_at', 'updated_at'];

function getTables() {
  return db
    .prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '%_fts%'
      ORDER BY name
    `)
    .all()
    .map((r) => r.name);
}

function getColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function getForeignKeys(table) {
  return db.prepare(`PRAGMA foreign_key_list(${table})`).all();
}

function getIndexes(table) {
  return db
    .prepare(`PRAGMA index_list(${table})`)
    .all()
    .filter((idx) => idx.origin !== 'pk');
}

console.log('=== DB Browser SQLite Check ===');
console.log('File:', dbPath);
console.log('user_version:', db.pragma('user_version', { simple: true }));
console.log('foreign_keys pragma:', db.pragma('foreign_keys', { simple: true }));
console.log('');

const tables = getTables();
const issues = [];
const summary = [];

for (const table of tables) {
  const cols = getColumns(table);
  const colNames = cols.map((c) => c.name);
  const missingAudit = AUDIT_COLS.filter((c) => !colNames.includes(c));
  const fks = getForeignKeys(table);
  const indexes = getIndexes(table);

  summary.push({
    table,
    columns: colNames.length,
    missingAudit: missingAudit.length ? missingAudit.join(', ') : 'OK',
    fkCount: fks.length,
    indexCount: indexes.length
  });

  if (missingAudit.length) {
    issues.push(`${table}: missing audit columns [${missingAudit.join(', ')}]`);
  }
}

console.log('--- Tables (Browse Data / Database Structure) ---');
for (const row of summary) {
  console.log(
    `${row.table.padEnd(22)} cols=${String(row.columns).padStart(2)}  audit=${row.missingAudit.padEnd(20)} FK=${row.fkCount}  indexes=${row.indexCount}`
  );
}

console.log('\n--- Legacy columns (should be absent for 3NF) ---');
for (const table of ['trip_plans', 'notifications']) {
  const legacy = getColumns(table).filter((c) => c.name === 'user_email' || c.name === 'items_json' || c.name === 'destination');
  console.log(`${table}:`, legacy.length ? legacy.map((c) => c.name).join(', ') : 'clean');
}

console.log('\n--- Broken migration FK targets (should be 0) ---');
const broken = db
  .prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%_migrate_%'")
  .all();
if (!broken.length) {
  console.log('None');
} else {
  for (const row of broken) {
    const refs = row.sql.match(/REFERENCES\s+"?[^"(]+/gi) || [];
    console.log(row.name, refs.join('; '));
  }
}

console.log('\n--- 3NF key tables: column detail ---');
for (const table of ['trip_plans', 'messages', 'notifications', 'itinerary_items', 'chat_rooms']) {
  console.log(`\n[${table}]`);
  for (const col of getColumns(table)) {
    console.log(`  ${col.name} ${col.type}${col.pk ? ' PK' : ''}${col.notnull ? ' NOT NULL' : ''}`);
  }
  const fks = getForeignKeys(table);
  if (fks.length) {
    console.log('  Foreign keys:');
    for (const fk of fks) {
      console.log(`    ${fk.from} -> ${fk.table}(${fk.to}) ON DELETE ${fk.on_delete}`);
    }
  }
}

console.log('\n--- Sample rows (what you see in Browse Data) ---');
const plan = db.prepare(`
  SELECT tp.id, tp.name, d.name AS destination, tp.user_id, u.email AS user_email, tp.created_at
  FROM trip_plans tp
  LEFT JOIN destinations d ON d.id = tp.destination_id
  LEFT JOIN users u ON u.id = tp.user_id
  LIMIT 1
`).get();
console.log('trip_plans sample:', plan || '(empty)');

const msg = db.prepare(`
  SELECT m.id, m.room, fu.email AS from_email, tu.email AS to_email, substr(m.content,1,40) AS content
  FROM messages m
  LEFT JOIN users fu ON fu.id = m.from_user_id
  LEFT JOIN users tu ON tu.id = m.to_user_id
  LIMIT 1
`).get();
console.log('messages sample:', msg || '(empty)');

console.log('\n--- Issues ---');
if (issues.length) {
  issues.forEach((i) => console.log('  !', i));
} else {
  console.log('  None — all tables have created_by, updated_by, created_at, updated_at');
}

db.close();
