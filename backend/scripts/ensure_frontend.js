const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const frontendHost = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const projectRoot = path.join(__dirname, '..', '..');

function isFrontendUp() {
  return new Promise((resolve) => {
    const request = http.get(`${frontendHost}/`, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(2500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function startFrontend() {
  console.log('[dev] Frontend nuk eshte aktiv — duke nisur Vite...');
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(command, ['run', 'dev'], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
    windowsHide: true,
    env: {
      ...process.env,
      AUTO_STARTED_BY_BACKEND: '1'
    }
  });

  child.unref();
}

async function ensureFrontendRunning() {
  if (process.env.RUN_BY_DEV_ALL === '1' || process.env.AUTO_START_FRONTEND === 'false') {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (await isFrontendUp()) {
    console.log(`[dev] Frontend eshte aktiv: ${frontendHost}`);
    return;
  }

  startFrontend();

  setTimeout(async () => {
    if (await isFrontendUp()) {
      console.log(`[dev] Faqja e aplikacionit: http://localhost:5173`);
    } else {
      console.log('[dev] Nese faqja nuk hapet, nga folderi kryesor ekzekuto: npm start');
    }
  }, 5000);
}

module.exports = { ensureFrontendRunning };
