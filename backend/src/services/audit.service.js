const { AuditLog } = require('../models');
const { AUDIT_ACTIONS } = require('../config/constants');
const { roleNameOf } = require('../utils/accessControl');
const { getIp, getUserAgent } = require('../utils/requestInfo');
const logger = require('../utils/logger');

/**
 * Writes audit trail rows.
 *
 * `record` is called from the `audit` middleware after the response has been
 * flushed, so it must never throw into the request lifecycle: failures are
 * logged and swallowed.
 */
function record({ user, action, resource, resourceId = null, patientId = null, req, statusCode, durationMs, metadata = {} }) {
  if (!AUDIT_ACTIONS[action]) {
    logger.warn('audit.unknown_action', { action });
  }

  return AuditLog.create({
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userRole: roleNameOf(user),
    action,
    resource,
    resourceId: resourceId === null || resourceId === undefined ? null : String(resourceId),
    patientId: patientId ?? null,
    method: req?.method ?? null,
    path: req?.originalUrl ?? null,
    ipAddress: req ? getIp(req) : null,
    userAgent: req ? getUserAgent(req) : null,
    statusCode: statusCode ?? null,
    durationMs: durationMs ?? null,
    metadata,
  });
}

module.exports = { record };
