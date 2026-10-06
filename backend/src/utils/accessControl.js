const { Op } = require('sequelize');
const { ROLES } = require('../config/constants');
const { CLINICAL_ROLES } = require('../config/permissions');
const { sameId } = require('./ids');

/**
 * Ownership / RBAC assertions for patient-scoped resources.
 * These are the guard rails behind the security rules in the README:
 *  - a PATIENT may only ever read or mutate *their own* records
 *  - only clinical staff may see full clinical detail
 */

/**
 * Canonical role name for a principal.
 *
 * `req.user.role` is the eager loaded Role row when the association was
 * included, and a plain string in a few internal helpers, so every check goes
 * through this function instead of reading `user.role` directly.
 */
function roleNameOf(user) {
  if (!user) return null;
  if (typeof user.roleName === 'string') return user.roleName;

  const role = user.role ?? (typeof user.get === 'function' ? user.get('role') : undefined);
  if (typeof role === 'string') return role;
  return role?.name ?? null;
}

/** Returns the Patient row id that the given user is allowed to act as. */
function resolveOwnPatientId(user, patientRow) {
  const role = roleNameOf(user);
  if (!user || !role) return null;
  if (role === ROLES.PATIENT) return user.patientId ?? null;
  if (role === ROLES.SUPER_ADMIN) return patientRow ? patientRow.id : null;
  return null;
}

const isClinicalStaff = (user) => CLINICAL_ROLES.includes(roleNameOf(user));
const isAdmin = (user) => [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN].includes(roleNameOf(user));

/**
 * Guards access to a patient record.
 * @param {object} user authenticated principal (`req.user`)
 * @param {object|null} patientRow the patient being accessed
 * @param {{write?: boolean}} [options]
 */
function assertPatientAccess(user, patientRow, options = {}) {
  const action = options.write ? 'modify' : 'view';
  if (!user) return { ok: false, statusCode: 401, message: 'Authentication required' };

  if (isClinicalStaff(user) || isAdmin(user)) return { ok: true, scope: 'staff' };

  if (roleNameOf(user) === ROLES.PATIENT) {
    const ownId = user.patientId ?? null;
    if (patientRow && ownId && sameId(patientRow.id, ownId)) {
      return { ok: true, scope: 'owner' };
    }
    return {
      ok: false,
      statusCode: 403,
      message: `You are not authorised to ${action} this patient's records`,
    };
  }

  // Roles without patient-level access (receptionist, accountant, pharmacist...)
  return {
    ok: false,
    statusCode: 403,
    message: `Your role (${roleNameOf(user)}) is not permitted to ${action} clinical records`,
  };
}

/** Where-clause fragment scoping a patient query for a patient-level user. */
function scopePatientQuery(user, patientColumn = 'id') {
  if (!user) return undefined;
  if (roleNameOf(user) === ROLES.PATIENT) {
    return user.patientId ? { [patientColumn]: user.patientId } : { [patientColumn]: { [Op.is]: null } };
  }
  return undefined;
}

module.exports = {
  roleNameOf,
  resolveOwnPatientId,
  isClinicalStaff,
  isAdmin,
  assertPatientAccess,
  scopePatientQuery,
};