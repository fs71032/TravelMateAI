const { execSync } = require('child_process');

const ports = process.argv.slice(2).map(Number).filter(Boolean);
const defaultPorts = [4000, 5173, 5174, 5175];
const targets = ports.length ? ports : defaultPorts;

function killPortOnWindows(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();

    for (const line of output.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) {
        continue;
      }

      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        pids.add(pid);
      }
    }

    if (pids.size === 0) {
      console.log(`[kill-port] port ${port} is already free`);
      return;
    }

    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' });
      console.log(`[kill-port] stopped process ${pid} on port ${port}`);
    }
  } catch {
    console.log(`[kill-port] port ${port} is already free`);
  }
}

for (const port of targets) {
  killPortOnWindows(port);
}
