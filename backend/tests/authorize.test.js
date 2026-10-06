const { authorize, authorizeAny, authorizeRoles, permissionSet, hasPermission } = require('../src/middleware/authorize');

/** Minimal `req.user` stand-in: `authorize` reads the role name and its permission list. */
function asUser(roleName, permissions = []) {
  return { role: { name: roleName, permissions: permissions.map((name) => ({ permissionName: name })) } };
}

const run = (middleware, user) => {
  const error = {};
  const res = {};
  middleware({ user }, res, (err) => {
    error.value = err ?? null;
  });
  return error.value;
};

const ADMIN = asUser('SUPER_ADMIN');
const NURSE = asUser('NURSE', ['nursing:write', 'patients:read']);
const DOCTOR = asUser('DOCTOR', ['consultations:write', 'patients:read']);
const ACCOUNTANT = asUser('ACCOUNTANT', ['payments:verify']);
const PATIENT = asUser('PATIENT', ['patients:read_self']);

describe('middleware/authorize', () => {
  describe('permissionSet', () => {
    it('reads permissions from the eager-loaded role', () => {
      expect(permissionSet(NURSE).has('nursing:write')).toBe(true);
      expect(permissionSet(NURSE).has('billing:manage')).toBe(false);
    });

    it('falls back to the static role matrix when none were loaded', () => {
      const set = permissionSet({ role: { name: 'NURSE' } });
      expect(set.has('nursing:write')).toBe(true);
    });

    it('is empty for a user with no role', () => {
      expect(permissionSet(null).size).toBe(0);
    });
  });

  describe('authorize (AND semantics)', () => {
    it('passes when every required permission is held', () => {
      expect(run(authorize('nursing:write', 'patients:read'), NURSE)).toBeNull();
    });

    it('fails when only some of the permissions are held', () => {
      const error = run(authorize('nursing:write', 'billing:manage'), NURSE);
      expect(error.statusCode).toBe(403);
    });

    it('lets the super admin through everything', () => {
      expect(run(authorize('billing:manage', 'anything:at:all'), ADMIN)).toBeNull();
    });

    it('rejects anonymous requests with 401, not 403', () => {
      const error = run(authorize('patients:read'), undefined);
      expect(error.statusCode).toBe(401);
    });

    it('accepts a role requirement', () => {
      expect(run(authorize({ role: 'NURSE' }), NURSE)).toBeNull();
      const error = run(authorize({ role: ['NURSE', 'DOCTOR'] }), PATIENT);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('authorizeAny (OR semantics)', () => {
    it('admits a caller holding just one of the permissions', () => {
      expect(run(authorizeAny('nursing:write', 'consultations:write'), NURSE)).toBeNull();
      expect(run(authorizeAny('nursing:write', 'consultations:write'), DOCTOR)).toBeNull();
    });

    it('rejects a caller holding none of them', () => {
      const error = run(authorizeAny('nursing:write', 'consultations:write'), ACCOUNTANT);
      expect(error.statusCode).toBe(403);
    });

    it('still lets the super admin through', () => {
      expect(run(authorizeAny('a:b', 'c:d'), ADMIN)).toBeNull();
    });

    it('rejects anonymous requests with 401', () => {
      expect(run(authorizeAny('a:b'), undefined).statusCode).toBe(401);
    });
  });

  describe('authorizeRoles', () => {
    it('admits any one of the listed roles', () => {
      expect(run(authorizeRoles('NURSE', 'DOCTOR'), DOCTOR)).toBeNull();
      expect(run(authorizeRoles('NURSE', 'DOCTOR'), NURSE)).toBeNull();
      expect(run(authorizeRoles('NURSE', 'DOCTOR'), PATIENT).statusCode).toBe(403);
    });
  });

  describe('hasPermission', () => {
    it('reports a missing permission', () => {
      expect(hasPermission(DOCTOR, 'consultations:write')).toBe(true);
      expect(hasPermission(DOCTOR, 'billing:manage')).toBe(false);
    });
  });
});