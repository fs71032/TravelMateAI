const { db, dbPath } = require('../db');

console.log('Database:', dbPath);

function run(sql) {
  try {
    db.prepare(sql).run();
  } catch (err) {
    console.error('FTS error:', err.message || err);
  }
}

// Create simple FTS tables that include id so we can join back
run(`CREATE VIRTUAL TABLE IF NOT EXISTS destinations_fts USING fts5(id, name, description` + `);`);
run(`CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(id, content` + `);`);
run(`CREATE VIRTUAL TABLE IF NOT EXISTS trip_plans_fts USING fts5(id, name, items_json` + `);`);

// Populate FTS tables (rebuild)
db.prepare('DELETE FROM destinations_fts').run();
db.prepare('DELETE FROM messages_fts').run();
db.prepare('DELETE FROM trip_plans_fts').run();

const dests = db.prepare('SELECT id, name, description FROM destinations').all();
const insDest = db.prepare('INSERT INTO destinations_fts (id, name, description) VALUES (?, ?, ?)');
for (const d of dests) insDest.run(d.id, d.name || '', d.description || '');

const msgs = db.prepare('SELECT id, content FROM messages').all();
const insMsg = db.prepare('INSERT INTO messages_fts (id, content) VALUES (?, ?)');
for (const m of msgs) insMsg.run(m.id, m.content || '');

const plans = db.prepare('SELECT id, name, items_json FROM trip_plans').all();
const insPlan = db.prepare('INSERT INTO trip_plans_fts (id, name, items_json) VALUES (?, ?, ?)');
for (const p of plans) insPlan.run(p.id, p.name || '', p.items_json || '');

console.log('FTS tables created and populated.');
