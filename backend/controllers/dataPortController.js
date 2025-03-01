const dataPortService = require('../services/dataPortService');
const reportService = require('../services/reportService');
const { sendServiceResult } = require('./controllerUtils');

async function exportTable(req, res) {
  const table = req.params.table;
  const format = (req.query.format || 'json').toString().toLowerCase();
  const result = dataPortService.exportTable(table, format);

  if (result.error) {
    return sendServiceResult(res, result);
  }

  if (result.format === 'excel') {
    const buffer = await dataPortService.buildExcelBuffer(result.table, result.data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${table}.xlsx"`);
    return res.send(Buffer.from(buffer));
  }

  if (result.headers) {
    Object.entries(result.headers).forEach(([key, value]) => res.setHeader(key, value));
  }
  return res.send(result.data);
}

async function importTable(req, res) {
  const table = req.params.table;
  let payload = req.body;
  const contentType = (req.headers['content-type'] || '').toString();

  if (contentType.includes('spreadsheetml') || contentType.includes('octet-stream')) {
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ message: 'Empty Excel file.' });
    }
    const parsed = await dataPortService.parseExcelBuffer(req.body);
    if (parsed.error) return sendServiceResult(res, parsed);
    payload = parsed.data;
  } else if (contentType.includes('text/csv')) {
    const text = typeof req.body === 'string' ? req.body : '';
    if (!text) return res.status(400).json({ message: 'Empty CSV body.' });
    payload = dataPortService.parseCsv(text);
  }

  return sendServiceResult(res, dataPortService.importRows(table, payload));
}

async function reportSummary(req, res) {
  const result = reportService.generateReport(req.body);
  if (result.error) return sendServiceResult(res, result);

  if (result.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
    return res.send(result.data);
  }

  if (result.format === 'excel') {
    const buffer = await reportService.buildReportExcel(result.data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    return res.send(Buffer.from(buffer));
  }

  return sendServiceResult(res, result);
}

module.exports = { exportTable, importTable, reportSummary };
