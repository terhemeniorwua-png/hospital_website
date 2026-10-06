module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/utils/**/*.js',
    'src/validators/**/*.js',
    'src/middleware/**/*.js',
    'src/config/permissions.js',
  ],
  clearMocks: true,
};