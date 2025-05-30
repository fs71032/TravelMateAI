const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'travelmate.db'), { readonly: true });

const rows = db.prepare("SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all();
const byType = {};
for (const row of rows) {
  byType[row.type] = byType[row.type] || [];
  byType[row.type].push(row.name);
}
console.log(JSON.stringify(byType, null, 2));
console.log('TOTAL objects:', rows.length);
db.close();
