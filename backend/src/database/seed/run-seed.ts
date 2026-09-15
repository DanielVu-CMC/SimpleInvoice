import 'dotenv/config';
import { config } from 'dotenv';
import { createDataSource } from '../data-source';
import { seedDatabase } from './seed';
config({ path: '../.env', quiet: true });
async function run() {
  const {
    SEED_USER_EMAIL: email,
    SEED_USER_PASSWORD: password,
    SEED_USER_NAME: fullname,
  } = process.env;
  if (!email || !password)
    throw new Error(
      'SEED_USER_EMAIL and SEED_USER_PASSWORD must be configured',
    );
  const source = createDataSource();
  try {
    await source.initialize();
    await source.runMigrations();
    const result = await seedDatabase(source, {
      email,
      password,
      fullname: fullname ?? 'Alex Morgan',
    });
    console.log(`Seeded ${result.count} invoices. Reviewer: ${result.email}`);
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}
void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seeding failed');
  process.exitCode = 1;
});
