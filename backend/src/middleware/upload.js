const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Controlled, private file uploads.
 *
 * - files are stored OUTSIDE the web root with unguessable names
 * - the original filename never influences the stored path (no traversal)
 * - MIME type *and* extension must both be allowed
 * - documents are only ever served through an authorised controller action
 */

const ALLOWED = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/dicom': ['.dcm'],
  'text/csv': ['.csv'],
};

const ALLOWED_EXTENSIONS = Array.from(new Set(Object.values(ALLOWED).flat()));

const categoryDir = (category) => String(category || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

ensureDir(env.UPLOAD_DIR);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(env.UPLOAD_DIR, categoryDir(req.uploadCategory));
    ensureDir(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 10);
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(AppError.badRequest(`Unsupported file extension: ${ext || 'none'}`));
  }
  if (!ALLOWED[mime] || !ALLOWED[mime].includes(ext)) {
    return cb(AppError.badRequest(`File type ${mime} is not allowed`));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 5,
  },
});

/** Sets the upload sub-folder from a route param before multer runs. */
const withCategory = (category) => (req, res, next) => {
  req.uploadCategory = category;
  return next();
};

const single = (category) => [withCategory(category), upload.single('file')];
const multiple = (category) => [withCategory(category), upload.array('files', 5)];

/** Absolute path for a stored document row, guarding against traversal. */
function resolveStoredPath(storedName, category) {
  const dir = path.join(env.UPLOAD_DIR, categoryDir(category));
  const target = path.resolve(dir, path.basename(String(storedName || '')));
  if (!target.startsWith(path.resolve(dir) + path.sep)) {
    throw AppError.badRequest('Invalid document path');
  }
  return target;
}

module.exports = { upload, single, multiple, resolveStoredPath, ALLOWED, ALLOWED_EXTENSIONS, ensureDir };