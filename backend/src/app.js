const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

/**
 * Express application factory.
 *
 * Kept separate from `server.js` so the test suite can mount the app with
 * supertest without opening a port.
 */
function createApp() {
  const app = express();

  // Required for correct client IPs (and therefore rate limiting) behind a proxy.
  app.set('trust proxy', env.isProduction ? 1 : 0);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin tooling (curl, server to server, tests) sends no origin.
        if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  if (!env.isTest) {
    app.use(
      morgan(env.isProduction ? 'combined' : 'dev', {
        stream: { write: (line) => logger.info('http.access', { line: line.trim() }) },
        skip: (req) => req.path === '/health',
      }),
    );
  }

  app.use(apiLimiter);

  app.get('/health', (req, res) =>
    res.json({
      success: true,
      message: 'Hospital Management API is running',
      data: {
        service: 'hospital-management-api',
        environment: env.NODE_ENV,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    }),
  );

  app.use(env.API_PREFIX, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
module.exports.createApp = createApp;
