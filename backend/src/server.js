const http = require('http');
const env = require('./config/env');
const logger = require('./utils/logger');
const createApp = require('./app');
const { connectWithRetry, sequelize } = require('./config/database');

/**
 * Process entry point: verifies the database connection, boots the HTTP server
 * and installs graceful shutdown handlers.
 */
async function start() {
  await connectWithRetry();

  const app = createApp();
  const server = http.createServer(app);

  const { attachRealtime } = require('./realtime/socket');
  attachRealtime(server);

  if (env.JOB_INTERVALS_ENABLED) {
    const { startJobs } = require('./jobs');
    startJobs();
  }

  await new Promise((resolve) => server.listen(env.PORT, env.HOST, resolve));

  logger.info('server.started', {
    port: env.PORT,
    host: env.HOST,
    env: env.NODE_ENV,
    apiPrefix: env.API_PREFIX,
    dbSource: env.dbSource,
  });

  const shutdown = async (signal) => {
    logger.info('server.shutdown_started', { signal });
    server.close(async () => {
      try {
        const { stopJobs } = require('./jobs');
        stopJobs();
        await sequelize.close();
      } catch (error) {
        logger.error('server.shutdown_error', { message: error.message });
      }
      logger.info('server.shutdown_complete', { signal });
      process.exit(0);
    });

    // Do not wait forever for lingering keep-alive connections.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('process.unhandled_rejection', { reason: reason?.message || String(reason) });
  });

  return server;
}

if (require.main === module) {
  start().catch((error) => {
    logger.error('server.start_failed', { message: error.message, stack: error.stack });
    // Render scrapes stdout/stderr, so mirror the failure there as well.
    // eslint-disable-next-line no-console
    console.error(`[fatal] server failed to start: ${error.message}\n${error.stack}`);
    process.exit(1);
  });
}

module.exports = start;
