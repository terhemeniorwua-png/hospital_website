/**
 * Unit tests must never touch the development database, so the connection
 * config is pinned to an unusable host and NODE_ENV is forced to `test`.
 */
process.env.NODE_ENV = 'test';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.DB_NAME = 'hospital_test_unused';
process.env.JWT_SECRET = 'unit-test-secret';