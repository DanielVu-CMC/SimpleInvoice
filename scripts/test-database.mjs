import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const values = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
const name = 'simpleinvoice_test';
const result = spawnSync(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'database',
    'sh',
    '-c',
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname=\'simpleinvoice_test\'" | grep -q 1 || createdb -U "$POSTGRES_USER" simpleinvoice_test',
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0)
  throw new Error(
    'Could not create test database. Start the Compose database service first.',
  );
const url = `postgresql://${encodeURIComponent(values.DATABASE_USERNAME)}:${encodeURIComponent(values.DATABASE_PASSWORD)}@localhost:${values.DATABASE_PORT}/${name}`;
writeFileSync('.env.test', `TEST_DATABASE_URL=${url}\n`, { mode: 0o600 });
console.log(
  'Created isolated simpleinvoice_test database and wrote .env.test.',
);
