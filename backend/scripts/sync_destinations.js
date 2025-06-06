const { syncDestinations, listDestinations } = require('../destinationStore');

syncDestinations();
const rows = listDestinations();

console.log('Destinations synced:\n');
for (const row of rows) {
  console.log(`- ${row.name} (${row.location})`);
}
