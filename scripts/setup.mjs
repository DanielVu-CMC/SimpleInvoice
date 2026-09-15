import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
if (existsSync('.env')) {
  console.log('.env already exists; kept your configuration.');
} else {
  const dbPassword = randomBytes(24).toString('hex');
  const jwtSecret = randomBytes(48).toString('hex');
  const template = readFileSync('.env.example', 'utf8');
  writeFileSync(
    '.env',
    template
      .replaceAll('replace-with-a-database-password', dbPassword)
      .replaceAll(
        'replace-with-a-random-secret-of-at-least-32-characters',
        jwtSecret,
      ),
    { mode: 0o600 },
  );
  console.log(
    'Created .env with generated database and JWT secrets. Demo reviewer credentials are documented in README.md.',
  );
}
