const { connectDatabase, disconnectDatabase } = require('./support/database');

/**
 * Database-backed tests for the login path.
 *
 * These exist because `User` has a `defaultScope` that excludes `passwordHash`:
 * without an explicit `withPassword` scope the credential check silently
 * compares against `undefined` and rejects every password in the system.
 *
 * The whole suite is skipped when the seeded database is unreachable.
 */
describe('auth: credential lookup (database)', () => {
  let sequelize = null;
  let User;
  let authService;
  let comparePassword;

  beforeAll(async () => {
    sequelize = await connectDatabase();
    if (!sequelize) return;

    User = require('../src/models').User;
    authService = require('../src/services/auth.service');
    ({ comparePassword } = require('../src/utils/password'));
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase(sequelize);
  });

  const loaded = () => Boolean(sequelize);

  it('reaches a seeded database', () => {
    if (!loaded()) {
      console.warn('Skipped: no seeded database reachable from tests.');
      return;
    }
    expect(loaded()).toBe(true);
  });

  it('exposes the hash only through the withPassword scope', async () => {
    if (!loaded()) return;

    const withHash = await User.scope('withPassword').findOne({
      where: { email: 'superadmin@hospital.test' },
    });
    expect(withHash).not.toBeNull();
    expect(withHash.passwordHash).toEqual(expect.any(String));

    const masked = await User.findOne({ where: { email: 'superadmin@hospital.test' } });
    expect(masked.passwordHash).toBeUndefined();
  });

  it('compares the seeded bcrypt hash against the demo password', async () => {
    if (!loaded()) return;

    const user = await User.scope('withPassword').findOne({
      where: { email: 'superadmin@hospital.test' },
    });

    expect(await comparePassword('Password123!', user.passwordHash)).toBe(true);
    expect(await comparePassword('wrong-password', user.passwordHash)).toBe(false);
  });

  it('logs in with valid credentials', async () => {
    if (!loaded()) return;

    const session = await authService.login({
      email: 'superadmin@hospital.test',
      password: 'Password123!',
      req: { ip: '127.0.0.1', headers: {}, get: () => undefined },
    });

    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.refreshToken).toEqual(expect.any(String));
    expect(session.user.email).toBe('superadmin@hospital.test');
    expect(session.user.role).toBe('SUPER_ADMIN');
    expect(session.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password with 401', async () => {
    if (!loaded()) return;

    await expect(
      authService.login({
        email: 'superadmin@hospital.test',
        password: 'NotThePassword1!',
        req: { ip: '127.0.0.1', headers: {}, get: () => undefined },
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects an unknown account with the same 401 message', async () => {
    if (!loaded()) return;

    await expect(
      authService.login({
        email: 'nobody@hospital.test',
        password: 'Password123!',
        req: { ip: '127.0.0.1', headers: {}, get: () => undefined },
      }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
  });

  it('reports the permission list through me()', async () => {
    if (!loaded()) return;

    const profile = await authService.me(1);

    expect(profile.permissions.length).toBeGreaterThan(0);
    expect(profile.passwordHash).toBeUndefined();
    expect(profile.role).toBe('SUPER_ADMIN');
  });
});