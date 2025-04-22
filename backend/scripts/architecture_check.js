const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

const controllerFiles = fs.readdirSync(path.join(root, 'controllers')).filter((f) => f.endsWith('.js'));
const serviceFiles = fs.readdirSync(path.join(root, 'services')).filter((f) => f.endsWith('.js'));
const repositoryFiles = fs.readdirSync(path.join(root, 'repositories')).filter((f) => f.endsWith('.js'));

const serverSql = (serverJs.match(/db\.prepare/g) || []).length;
const controllerSql = controllerFiles.reduce((sum, file) => {
  const text = fs.readFileSync(path.join(root, 'controllers', file), 'utf8');
  return sum + (text.match(/db\.prepare/g) || []).length;
}, 0);

console.log('=== ARKITEKTURË E SHTRESËZUAR ===\n');
console.log(`Controllers: ${controllerFiles.length} skedarë`);
console.log(`Services:    ${serviceFiles.length} skedarë`);
console.log(`Repositories:${repositoryFiles.length} skedarë`);
console.log(`Routes:      routes/index.js`);
console.log('');
console.log(`SQL në server.js:      ${serverSql} (synimi: 0)`);
console.log(`SQL në controllers:    ${controllerSql} (synimi: 0)`);
console.log('');

const ok = serverSql === 0 && controllerSql === 0 && controllerFiles.length >= 8 && serviceFiles.length >= 8 && repositoryFiles.length >= 8;
console.log(ok ? '✓ Struktura layered plotësohet.' : '✗ Ka mangesa në strukturë.');
process.exit(ok ? 0 : 1);
