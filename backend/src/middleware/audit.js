const { AUDIT_ACTIONS } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Declarative audit logging middleware.
 *
 *   router.get('/:id', audit(AUDIT_ACTIONS.PATIENT_VIEWED, 'patient'), handler)
 *
 * The log row is written after the response is flushed so auditing never adds
 * latency to (or breaks) the request itself. Failures are swallowed and logged.
 */

/** Reads `req.params.id` / `req.body.id` / `req.params.*Id` for resourceId. */
function resolveResourceId(req) {
  const paramKey = Object.keys(req.params || {}).find((key) => /^(id|[a-z]+Id)$/i.test(key));
  return paramKey ? req.params[paramKey] : req.params?.id ?? null;
}

function resolvePatientId(req, res) {
  const candidates = [
    res.locals?.patientId,
    req.params?.patientId,
    req.body?.patientId,
    res.locals?.record?.patientId,
  ];
  const found = candidates.find((value) => value !== undefined && value !== null);
  return found ?? null;
}

/**
 * @param {string} action one of `AUDIT_ACTIONS`
 * @param {string} resource resource name, e.g. 'patient'
 * @param {{onlyStatus?: number[]}} [options]
 */
function audit(action, resource, options = {}) {
  return function auditMiddleware(req, res, next) {
    const startedAt = Date.now();

    res.on('finish', () => {
      const { auditService } = require('../services/audit.service');
      try {
        auditService.record({
          user: req.user,
          action,
          resource,
          resourceId: resolveResourceId(req),
          patientId: resolvePatientId(req, res),
          req,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
          metadata: options.metadata || {},
        });
      } catch (error) {
        logger.error('audit.write_failed', { action, error: error.message });
      }
    });

    return next();
  };
}

/** Ensures `res.locals.patientId` is set so audit rows can be linked to a patient. */
const setAuditPatient = (patientId) => (req, res, next) => {
  res.locals.patientId = patientId;
  return next();
};

module.exports = audit;
module.exports.audit = audit;
module.exports.setAuditPatient = setAuditPatient;
module.exports.ACTIONS = AUDIT_ACTIONS;