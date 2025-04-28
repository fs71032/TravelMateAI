const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'travelmate.db');
const db = new Database(dbPath, { readonly: true });

const all = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((r) => r.name);

const appTables = all.filter((name) => !name.includes('_fts'));
const ftsVirtual = all.filter((name) => name.endsWith('_fts'));
const ftsInternal = all.filter((name) => name.includes('_fts_'));

console.log('Total tables (DB Browser count):', all.length);
console.log('App/business tables:', appTables.length);
console.log('FTS virtual tables:', ftsVirtual.length, ftsVirtual);
console.log('FTS internal shadow tables:', ftsInternal.length);
console.log('');
console.log('--- App tables ---');
appTables.forEach((t) => console.log(' ', t));
console.log('');
console.log('--- FTS extras (not separate entities in ER diagram) ---');
[...ftsVirtual, ...ftsInternal].forEach((t) => console.log(' ', t));

db.close();
