const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { hashRefreshToken } = require('../utils/tokenHash');

const root = path.join(__dirname, '..');
const routesSrc = fs.readFileSync(path.join(root, 'routes', 'index.js'), 'utf8');
const serverSrc = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const authSrc = fs.readFileSync(path.join(root, 'services', 'authService.js'), 'utf8');

const publicSensitive = [
  "router.get('/invoices'",
  "router.get('/payments'",
  "router.get('/files'",
  "router.get('/settings'",
  "router.get('/invoices', platformController",
];

const checks = [];

checks.push({
  name: 'JWT + refresh endpoints',
  ok: routesSrc.includes("/auth/refresh") && authSrc.includes('jwt.sign')
});

checks.push({
  name: 'Refresh tokens hashed (SHA-256)',
  ok: fs.readFileSync(path.join(root, 'repositories', 'refreshTokenRepository.js'), 'utf8').includes('hashRefreshToken')
});

checks.push({
  name: 'Sensitive GET routes require auth',
  ok: !routesSrc.includes("router.get('/invoices', platformController.listInvoices);") &&
    routesSrc.includes("router.get('/invoices', requireAuth")
});

checks.push({
  name: 'Admin routes use requireRole(admin)',
  ok: routesSrc.includes("requireRole('admin')")
});

checks.push({
  name: 'CORS not wide-open in dev',
  ok: !serverSrc.includes('if (isDevelopment) return true;')
});

checks.push({
  name: 'Socket identify verifies JWT',
  ok: serverSrc.includes('resolveUserFromAccessToken')
});

checks.push({
  name: 'JWT_SECRET documented in .env.example',
  ok: fs.readFileSync(path.join(root, '.env.example'), 'utf8').includes('JWT_SECRET')
});

checks.push({
  name: 'Production requires JWT_SECRET',
  ok: authSrc.includes("NODE_ENV === 'production'")
});

const db = new Database(path.join(root, 'data', 'travelmate.db'), { readonly: true });
const users = db.prepare('SELECT password_hash FROM users').all();
const allHashed = users.every((u) => String(u.password_hash || '').startsWith('$2'));
db.close();
checks.push({ name: 'Passwords bcrypt hashed in DB', ok: allHashed && users.length > 0 });

const sample = hashRefreshToken('test-token');
checks.push({ name: 'Token hash utility', ok: sample.length === 64 });

console.log('=== VERIFIKIM SIGURIE ===\n');
let allOk = true;
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}`);
  if (!c.ok) allOk = false;
}
console.log('\n' + (allOk ? '✓ Kushtet e sigurisë plotësohen.' : '✗ Ka mangesi.'));
process.exit(allOk ? 0 : 1);
