#!/bin/sh
set -eu
node dist/database/migrate.js
node dist/database/seed/run-seed.js
exec node dist/main.js
