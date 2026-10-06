const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { roleNameOf } = require('../utils/accessControl');
const { MEDICAL_RECORD_TYPES } = require('../config/constants');
const env = require('../config/env');
const { Document, Patient, User } = require('../models');
const { sameId } = require('../utils/ids');

/**
 * Document repository: secure uploads, patient-scoped access and downloads.
 *
 * - files are only served through this service (never from the uploads folder
 *   via static middleware) so IP/role checks and audit logging apply
 * - storage paths are stored relative to UPLOAD_DIR and validated
 * - an SHA-256 checksum allows integrity spot checks
 */

const ALLOWED_CATEGORIES = ['radiology', 'lab', 'report', 'discharge', 'prescription', 'consent', 'general'];

const DOCUMENT_INCLUDES = [
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
  { model: User, as: 'uploadedByUser', attributes: ['id', 'firstName', 'lastName'] },
];

function categoryDir(category) {
  const base = String(category || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return ALLOWED_CATEGORIES.includes(base) ? base : 'general';
}

function present(doc) {
  if (!doc) return null;
  const plain = doc.get({ plain: true });
  return {
    ...plain,
    fileName: plain.originalName,
    fileSize: plain.size,
    uploadedByName: plain.uploadedByUser ? `${plain.uploadedByUser.firstName} ${plain.uploadedByUser.lastName}` : null,
    patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
  };
}

async function list({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    query.patientId ? { patientId: query.patientId } : undefined,
    query.category ? { category: query.category } : undefined,
    query.referenceType ? { referenceType: query.referenceType } : undefined,
    query.referenceId ? { referenceId: query.referenceId } : undefined,
    query.private !== undefined ? { isPrivate: Boolean(query.private) } : undefined,
    searchWhere(query.search, [['title', 'string'], ['originalName', 'string']]),
  );

  const { rows, count } = await Document.findAndCountAll({
    where,
    include: DOCUMENT_INCLUDES,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { documents: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function getById({ user, id }) {
  const document = await Document.findByPk(id, { include: DOCUMENT_INCLUDES });
  if (!document) throw AppError.notFound('Document not found');
  if (roleNameOf(user) === 'PATIENT') {
    if (document.isPrivate && !sameId(document.patientId, user.patientId)) {
      throw AppError.forbidden('This document is private');
    }
    if (!sameId(document.patientId, user.patientId)) {
      throw AppError.forbidden('You are not authorised to view this document');
    }
  }
  return present(document);
}

/** Registers a file uploaded via multer. */
async function create({ user, file, data }) {
  if (!file) throw AppError.badRequest('A file must be uploaded');

  const patient = data.patientId ? await Patient.findByPk(data.patientId) : null;
  if (data.patientId && !patient) throw AppError.notFound('Patient not found');

  if (roleNameOf(user) === 'PATIENT') {
    if (data.patientId && !sameId(data.patientId, user.patientId)) {
      throw AppError.forbidden('You cannot upload to another patient');
    }
    if (!patient && user.patientId) {
      // eslint-disable-next-line no-await-in-loop
    }
  }

  const checksum = await computeChecksum(file.path);
  const storedName = path.basename(file.path);
  const storagePath = path.relative(env.UPLOAD_DIR, file.path).split(path.sep).join('/');

  const document = await Document.create({
    patientId: data.patientId ?? (roleNameOf(user) === 'PATIENT' ? user.patientId : null),
    uploadedBy: user.id,
    category: categoryDir(data.category),
    title: data.title || file.originalname,
    originalName: file.originalname,
    storedName,
    storagePath,
    mimeType: file.mimetype,
    size: file.size,
    checksum,
    referenceType: data.referenceType ?? null,
    referenceId: data.referenceId ?? null,
    isPrivate: Boolean(data.isPrivate),
    notes: data.notes ?? null,
  });

  if (document.patientId) {
    const medicalRecordService = require('./medicalRecord.service');
    // eslint-disable-next-line no-await-in-loop
    await medicalRecordService.append({
      user,
      patientId: document.patientId,
      recordType: MEDICAL_RECORD_TYPES.DOCUMENT,
      title: `Document: ${document.title}`,
      summary: document.originalName,
      referenceType: 'document',
      referenceId: document.id,
    });
  }

  return present(document);
}

/** Validates and computes SHA-256 checksum. */
async function computeChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/** Reads the file from disk and returns the full path (or streams). */
async function getFilePath({ user, id }) {
  const document = await Document.findByPk(id);
  if (!document) throw AppError.notFound('Document not found');
  if (roleNameOf(user) === 'PATIENT') {
    if (!sameId(document.patientId, user.patientId)) throw AppError.forbidden('You cannot access this document');
  }

  const abs = path.join(env.UPLOAD_DIR, document.storagePath);
  if (!abs.startsWith(env.UPLOAD_DIR)) throw AppError.forbidden('Invalid file path');
  if (!fs.existsSync(abs)) throw AppError.notFound('Document file no longer exists');

  return { document: present(document), filePath: abs };
}

/** List/checksum matches. */
async function verifyChecksum({ user, id, checksum }) {
  const document = await Document.findByPk(id);
  if (!document) throw AppError.notFound('Document not found');
  if (roleNameOf(user) === 'PATIENT') {
    if (!sameId(document.patientId, user.patientId)) throw AppError.forbidden('You cannot access this document');
  }
  const abs = path.join(env.UPLOAD_DIR, document.storagePath);
  if (!fs.existsSync(abs)) throw AppError.notFound('Document file no longer exists');

  const actual = await computeChecksum(abs);
  return { match: actual === String(checksum || document.checksum), actual, expected: document.checksum };
}

module.exports = {
  list,
  getById,
  create,
  getFilePath,
  verifyChecksum,
  present,
  computeChecksum,
};
