// Script to POST a sample trip plan to the running backend and verify it in the DB
const fetch = globalThis.fetch || require('node-fetch');
const path = require('path');

async function main() {
  const url = process.env.BACKEND_URL || 'http://localhost:4000';
  const sample = {
    destination: 'Testville',
    items: [{ day: 1, title: 'Arrive', details: 'Check in and relax' }],
    name: 'Testville trip',
    userEmail: 'tester@example.com',
    updatedAt: new Date().toISOString()
  };

  console.log('Posting sample plan to', `${url}/api/itinerary/plans`);
  const res = await fetch(`${url}/api/itinerary/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sample)
  });

  if (!res.ok) {
    console.error('Failed to POST sample plan:', res.status, await res.text());
    process.exit(1);
  }

  const saved = await res.json();
  console.log('Saved plan id:', saved.id);

  // Verify directly from the DB file
  try {
    const db = require('../db').db;
    const row = db.prepare('SELECT * FROM trip_plans WHERE id = ?').get(saved.id);
    if (row) {
      console.log('Verified in DB. destination=', row.destination, 'user_email=', row.user_email);
    } else {
      console.error('Plan not found in DB.');
    }
  } catch (err) {
    console.error('DB verification failed:', err.message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
