import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backendRoot = path.resolve(root, 'backend');
const backendEntry = path.resolve(root, 'backend/dist/server.js');
const frontendDistPath = process.env.FRONTEND_DIST_PATH
  ? path.resolve(root, process.env.FRONTEND_DIST_PATH)
  : path.resolve(root, 'frontend/dist');
const frontendIndex = path.join(frontendDistPath, 'index.html');

if (!existsSync(backendEntry)) {
  console.error('Missing backend build at backend/dist/server.js. Run npm run build first.');
  process.exit(1);
}

if (!existsSync(frontendIndex)) {
  console.error('Missing frontend build at frontend/dist/index.html. Run npm run build first.');
  process.exit(1);
}

const child = spawn(process.execPath, [backendEntry], {
  stdio: 'inherit',
  cwd: backendRoot,
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
    SERVE_FRONTEND: 'true',
    FRONTEND_DIST_PATH: frontendDistPath,
  },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
