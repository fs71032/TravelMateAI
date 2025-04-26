const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'travelmate.db');
const db = new Database(dbPath, { readonly: true });

const MANDATORY = [
  'users', 'roles', 'user_roles', 'permissions', 'role_permissions',
  'refresh_tokens', 'audit_logs', 'notifications', 'settings', 'files'
];
const DOMAIN = [
  'destinations', 'trip_plans', 'itinerary_items', 'booking_suppliers', 'bookings',
  'invoices', 'payments', 'guides', 'travel_groups', 'group_members',
  'chat_rooms', 'messages', 'reviews', 'favorites'
];
const AUDIT = ['created_by', 'updated_by', 'created_at', 'updated_at'];

const tables = db
  .prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%'
    ORDER BY name
  `)
  .all()
  .map((r) => r.name);

const results = [];

function pass(label, ok, detail = '') {
  results.push({ label, ok, detail });
}

pass('Min. 24 tabela biznesi', tables.length >= 24, `${tables.length} tabela`);
pass('user_version = 3', db.pragma('user_version', { simple: true }) === 3, `v${db.pragma('user_version', { simple: true })}`);
pass('10 tabela të detyrueshme', MANDATORY.every((t) => tables.includes(t)), MANDATORY.filter((t) => !tables.includes(t)).join(', ') || 'të gjitha');
pass('14 tabela domeni', DOMAIN.every((t) => tables.includes(t)), DOMAIN.filter((t) => !tables.includes(t)).join(', ') || 'të gjitha');

const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
pass('users pa kolonë role (RBAC)', !userCols.includes('role'));
pass('users: first_name, password_hash', userCols.includes('first_name') && userCols.includes('password_hash'));

const specCols = {
  refresh_tokens: ['token_hash', 'revoked_at'],
  audit_logs: ['entity', 'entity_id', 'old_value', 'new_value', 'ip_address'],
  files: ['entity', 'entity_id', 'file_path', 'file_size', 'uploaded_by'],
  reviews: ['entity', 'entity_id'],
  favorites: ['entity', 'entity_id'],
  settings: ['description']
};
for (const [table, need] of Object.entries(specCols)) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  const miss = need.filter((c) => !cols.includes(c));
  pass(`${table} kolona spec`, miss.length === 0, miss.join(', '));
}

const auditMissing = [];
for (const table of tables) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  const miss = AUDIT.filter((c) => !cols.includes(c));
  if (miss.length) auditMissing.push(`${table}: ${miss.join(', ')}`);
}
pass('Audit në çdo tabelë', auditMissing.length === 0, auditMissing.join('; '));

const noAuditFk = [];
for (const table of tables) {
  const fks = db.prepare(`PRAGMA foreign_key_list(${table})`).all();
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  for (const col of ['created_by', 'updated_by']) {
    if (cols.includes(col) && !fks.some((f) => f.from === col && f.table === 'users')) {
      noAuditFk.push(`${table}.${col}`);
    }
  }
}
pass('FK audit -> users (created_by/updated_by)', noAuditFk.length === 0, noAuditFk.join(', ') || 'OK');

const noIndex = tables.filter((t) => {
  const idx = db.prepare(`PRAGMA index_list(${t})`).all().filter((i) => i.origin !== 'pk');
  return idx.length === 0;
});
pass('Indekse (≥1 jo-PK për tabelë)', noIndex.length === 0, noIndex.join(', ') || 'OK');

pass('foreign_keys ON', db.pragma('foreign_keys', { simple: true }) === 1);

console.log('=== VERIFIKIM KUSHTESH AKADEMIKE ===\n');
let allOk = true;
for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  console.log(`${mark} ${r.label}${r.detail ? ` — ${r.detail}` : ''}`);
  if (!r.ok) allOk = false;
}
console.log('\n' + (allOk ? 'PËRFUNDIM: Po, kushtet plotësohen.' : 'PËRFUNDIM: Ka mangesa të vogla (shiko ✗).'));
db.close();
