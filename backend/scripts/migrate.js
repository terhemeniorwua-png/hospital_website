#!/usr/bin/env node
/**
 * Thin CLI wrapper around the shared Umzug runner.
 *
 * Usage: node scripts/migrate.js [up|down|down-all|status]
 */
const path = require('path');

process.on('unhandledRejection', (error) => {
  console.error(error);
  process.exitCode = 1;
});

const { run } = require(path.join(__dirname, 'dbTasks'));

const action = process.argv[2] || 'up';

run('migration', action).then((code) => {
  process.exit(code);
});
