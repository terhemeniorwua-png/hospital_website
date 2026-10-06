const logger = require('../utils/logger');

function start() {
  logger.info('jobs.start', { module: 'jobs/index' });
}

function stop() {}

module.exports = { start, stop };
