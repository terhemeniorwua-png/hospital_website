const morgan = require('morgan');
const env = require('../config/env');
const logger = require('../utils/logger');

const skipHealth = (req) => req.path === '/health' || req.path === '/api/health';

const stream = {
  write: (message) => logger.info(message.trim()),
};

const httpLogger =
  env.NODE_ENV === 'test'
    ? morgan('tiny', { skip: () => true })
    : morgan(env.isProduction ? 'combined' : 'dev', {
        skip: skipHealth,
        stream,
      });

module.exports = httpLogger;