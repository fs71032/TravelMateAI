const { db } = require('./db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();

for (const { name } of tables) {
  console.log(`TABLE: ${name}`);
  const cols = db.prepare(`PRAGMA table_info(${name})`).all();
  for (const col of cols) {
    console.log('  ', col.cid, col.name, col.type, col.notnull ? 'NOT NULL' : 'NULL', col.dflt_value ? `DEFAULT ${col.dflt_value}` : '');
  }
  console.log('---');
}
