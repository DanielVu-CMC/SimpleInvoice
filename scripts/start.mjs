import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const docker = spawnSync('docker', ['compose', 'version'], {
  cwd: root,
  stdio: 'ignore',
});
if (docker.status !== 0) {
  console.error(
    'Docker Compose is required. Install Docker Desktop, OrbStack, or Docker Engine with Compose, then retry.',
  );
  process.exit(1);
}
const setup = spawnSync(process.execPath, ['scripts/setup.mjs'], {
  cwd: root,
  stdio: 'inherit',
});
if (setup.status !== 0) process.exit(setup.status ?? 1);
const result = spawnSync(
  'docker',
  ['compose', 'up', '-d', '--build', '--wait'],
  {
    cwd: root,
    stdio: 'inherit',
  },
);
if (result.status !== 0) {
  console.error(
    'Startup failed. Check docker compose logs and whether the configured ports are available.',
  );
  process.exit(result.status ?? 1);
}
console.log(
  'SimpleInvoice is healthy. Run docker compose ps for ports and docker compose down to stop.',
);
