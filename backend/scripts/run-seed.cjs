const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const compiled = resolve(__dirname, '../dist/database/seed/run-seed.js');
if (existsSync(compiled)) require(compiled);
else {
  require('ts-node/register');
  require('../src/database/seed/run-seed.ts');
}
