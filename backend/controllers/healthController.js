const { dbPath } = require('../db');

function health(_req, res) {
  res.json({ ok: true, database: dbPath, storage: 'sqlite' });
}

function root(_req, res) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.status(200).type('html').send(`<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=${frontendUrl}" />
  <title>TravelMate AI — API</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; display: grid; place-items: center; min-height: 100vh; margin: 0; }
    .box { max-width: 32rem; padding: 2rem; border: 1px solid #334155; border-radius: 1rem; background: #1e293b; text-align: center; }
    a { color: #22d3ee; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Ky është backend (API), jo faqja e aplikacionit.</h1>
    <p>Hape faqen këtu: <a href="${frontendUrl}">${frontendUrl}</a></p>
    <p>Duke ju ridrejtuar automatikisht…</p>
  </div>
  <script>location.replace(${JSON.stringify(frontendUrl)});</script>
</body>
</html>`);
}

module.exports = { health, root };
