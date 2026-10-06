const AppError = require('../utils/AppError');
const { ROLE_PERMISSIONS } = require('../config/permissions');
const { roleNameOf } = require('../utils/accessControl');

/**
 * Flattens `req.user.role.permissions` (eager loaded) into a Set.
 * Falls back to the static role matrix if permissions were not loaded.
 */
function permissionSet(user) {
  const fromDb = user?.role?.permissions?.map((rp) => rp.permission?.name ?? rp.permissionName).filter(Boolean);
  if (fromDb && fromDb.length) return new Set(fromDb);
  return new Set(ROLE_PERMISSIONS[roleNameOf(user)] || []);
}

const hasPermission = (user, permission) => permissionSet(user).has(permission);
const hasRole = (user, roles) => roles.includes(roleNameOf(user));

/**
 * RBAC + permission middleware.
 * @param {...(string|{role:string,permission?:string,resource:string,action:string})} requirements
 */
function authorize(...requirements) {
  const normalised = requirements.flat().map((req) =>
    typeof req === 'string' ? { permission: req } : req,
  );

  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized('Authentication required'));

    // Super admin bypasses everything.
    if (roleNameOf(req.user) === 'SUPER_ADMIN') return next();

    for (const requirement of normalised) {
      if (requirement.role) {
        if (!hasRole(req.user, Array.isArray(requirement.role) ? requirement.role : [requirement.role])) {
          return next(
            AppError.forbidden(
              `Access denied. Requires role: ${Array.isArray(requirement.role) ? requirement.role.join(' or ') : requirement.role}`,
            ),
          );
        }
      }
      if (requirement.permission && !hasPermission(req.user, requirement.permission)) {
        return next(
          AppError.forbidden(
            `Access denied. Missing permission: ${requirement.permission}`,
          ),
        );
      }
    }

    return next();
  };
}

/** Requires any one of the supplied roles. */
const authorizeRoles = (...roles) => authorize({ role: roles.flat() });

/** Requires all supplied permissions. */
const authorizePermissions = (...permissions) => authorize(...permissions.flat().map((p) => ({ permission: p })));

/**
 * Requires at least one of the supplied permissions.
 *
 * `authorize` is an AND gate, so use this where several roles should be able to
 * reach the same endpoint through *different* permissions (for example a nurse
 * recording vitals with `nursing:write` or a doctor with `consultations:write`).
 */
function authorizeAny(...permissions) {
  const wanted = permissions.flat().map((p) => ({ permission: p }));

  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized('Authentication required'));
    if (roleNameOf(req.user) === 'SUPER_ADMIN') return next();

    const held = permissionSet(req.user);
    if (wanted.some((requirement) => held.has(requirement.permission))) return next();

    return next(
      AppError.forbidden(`Access denied. Requires one of: ${wanted.map((r) => r.permission).join(', ')}`),
    );
  };
}

module.exports = {
  authorize,
  authorizeRoles,
  authorizePermissions,
  authorizeAny,
  hasPermission,
  hasRole,
  permissionSet,
};