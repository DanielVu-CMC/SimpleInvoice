import { createDataSource } from './data-source';
async function migrate() {
  const source = createDataSource();
  try {
    await source.initialize();
    const migrations = await source.runMigrations();
    console.log(`Applied ${migrations.length} migration(s)`);
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}
void migrate().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Migration failed');
  process.exitCode = 1;
});
