const { db } = require('./db');

const tables = ['users', 'trip_plans', 'bookings', 'notifications', 'messages'];

for (const table of tables) {
  const count = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
  console.log(`${table}: ${count}`);
}

console.log('\nSample trip plan:');
console.log(db.prepare('SELECT id, name, destination, user_email FROM trip_plans LIMIT 1').get());

console.log('\nSample booking:');
console.log(db.prepare('SELECT id, title, status FROM bookings LIMIT 1').get());
