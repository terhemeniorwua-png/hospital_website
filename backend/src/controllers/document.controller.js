const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const documentService = require('../services/document.service');

const list = asyncHandler(async (req, res) => {
  const result = await documentService.list({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Documents retrieved' });
});

const getById = asyncHandler(async (req, res) => {
  const data = await documentService.getById({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Document retrieved', data });
});

/** Multer populates `req.file`; the text fields arrive on `req.body`. */
const create = asyncHandler(async (req, res) => {
  const data = await documentService.create({ user: req.user, file: req.file, data: bodyOf(req) });
  return created(res, { message: 'Document uploaded', data });
});

/**
 * Streams the stored file. The service resolves and path-traversal-checks the
 * absolute path; the route is never a static file mount.
 */
const download = asyncHandler(async (req, res) => {
  const { document, filePath } = await documentService.getFilePath({
    user: req.user,
    id: paramsOf(req).id,
  });
  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
  if (document.fileSize) res.setHeader('Content-Length', document.fileSize);
  return res.sendFile(filePath);
});

const verifyChecksum = asyncHandler(async (req, res) => {
  const data = await documentService.verifyChecksum({
    user: req.user,
    id: paramsOf(req).id,
    checksum: bodyOf(req).checksum,
  });
  return success(res, { message: 'Checksum verified', data });
});

module.exports = { list, getById, create, download, verifyChecksum };