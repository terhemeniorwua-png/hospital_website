const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { queryOf, paramsOf, sendList } = require('../utils/http');
const medicalRecordService = require('../services/medicalRecord.service');

const list = asyncHandler(async (req, res) => {
  const result = await medicalRecordService.list({
    user: req.user,
    patientId: paramsOf(req).patientId,
    query: queryOf(req),
  });
  return sendList(res, result, { message: 'Medical record entries retrieved' });
});

const timeline = asyncHandler(async (req, res) => {
  const data = await medicalRecordService.timeline({
    user: req.user,
    patientId: paramsOf(req).patientId,
    query: queryOf(req),
  });
  return success(res, { message: 'Medical timeline', data });
});

const summary = asyncHandler(async (req, res) => {
  const data = await medicalRecordService.summary({ user: req.user, patientId: paramsOf(req).patientId });
  return success(res, { message: 'Record summary', data });
});

/**
 * Renders an export. JSON stays in the standard envelope so API clients can
 * consume it directly; `text` and `csv` are streamed as file downloads.
 */
const exportRecord = asyncHandler(async (req, res) => {
  const format = queryOf(req).format;
  const data = await medicalRecordService.exportRecord({
    user: req.user,
    patientId: paramsOf(req).patientId,
    req,
    format,
  });

  if (format === 'json') return success(res, { message: 'Record exported', data });

  const stamp = new Date().toISOString().slice(0, 10);
  const base = `medical-record-${paramsOf(req).patientId}-${stamp}`;

  if (format === 'csv') {
    const header = 'occurredAt,type,title,summary\n';
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = (data.timeline || [])
      .map((event) =>
        [event.occurredAt || '', event.type || '', event.title || '', event.summary || ''].map(escape).join(','),
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.csv"`);
    return res.status(200).send(header + rows + '\n');
  }

  const lines = [
    `Medical record export - ${base}`,
    `Generated at: ${data.generatedAt}`,
    '',
    ...(data.timeline || []).map(
      (event) => `- [${event.occurredAt || 'undated'}] ${event.type || 'EVENT'}: ${event.title || ''}\n  ${event.summary || ''}`.trim(),
    ),
  ];
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${base}.txt"`);
  return res.status(200).send(`${lines.join('\n')}\n`);
});

module.exports = { list, timeline, summary, exportRecord };