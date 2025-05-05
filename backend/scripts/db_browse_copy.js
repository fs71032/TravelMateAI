const fs = require('fs');
const os = require('os');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'data', 'travelmate.db');
const browsePath = path.join(os.tmpdir(), 'travelmate-browse.db');

if (!fs.existsSync(sourcePath)) {
  console.error('Database not found. Run the backend once first: npm start');
  process.exit(1);
}

try {
  fs.copyFileSync(sourcePath, browsePath);
} catch (error) {
  console.error('Stop the backend first (Ctrl+C), then run: npm run db:browse');
  console.error(error.message);
  process.exit(1);
}

console.log('Temporary copy for DB Browser (not stored in backend/data):');
console.log(browsePath);
