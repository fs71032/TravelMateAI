const ExcelJS = require('exceljs');
const { sqlDate } = require('../utils/dateFormat');
const reportRepository = require('../repositories/reportRepository');

function buildDateClause(startDate, endDate) {
  const clauses = [];
  const params = [];
  if (startDate) {
    clauses.push('created_at >= ?');
    params.push(sqlDate(startDate));
  }
  if (endDate) {
    clauses.push('created_at <= ?');
    params.push(`${sqlDate(endDate)} 23:59:59`);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function buildSummary(body) {
  const { startDate, endDate, groupBy } = body || {};
  const requestedMetrics = Array.isArray(body?.metrics) ? body.metrics : null;
  const metrics = (requestedMetrics && requestedMetrics.length
    ? requestedMetrics.filter((m) => reportRepository.REPORT_METRIC_TABLES[m])
    : Object.keys(reportRepository.REPORT_METRIC_TABLES));

  const { sql: dateSql, params: dateParams } = buildDateClause(startDate, endDate);

  const summary = {};
  for (const metric of metrics) {
    const { table, aggregate = 'COUNT(*) AS c', field = 'c' } = reportRepository.REPORT_METRIC_TABLES[metric];
    const row = reportRepository.queryMetric(table, aggregate, dateSql, dateParams);
    summary[metric] = row?.[field] || 0;
  }

  let breakdown = [];
  const groupExpr = groupBy && reportRepository.REPORT_GROUP_EXPRESSIONS[groupBy];
  if (groupExpr) {
    breakdown = reportRepository.queryBreakdown(groupExpr, dateSql, dateParams);
  }

  return {
    startDate: startDate ? sqlDate(startDate) : null,
    endDate: endDate ? sqlDate(endDate) : null,
    groupBy: groupExpr ? groupBy : null,
    metrics,
    summary,
    breakdown
  };
}

async function buildReportExcel(report) {
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 24 },
    { header: 'Value', key: 'value', width: 16 }
  ];
  summarySheet.addRows(Object.entries(report.summary).map(([metric, value]) => ({ metric, value })));
  if (report.breakdown.length) {
    const breakdownSheet = workbook.addWorksheet('Breakdown');
    breakdownSheet.columns = [
      { header: 'Group', key: 'group_key', width: 24 },
      { header: 'Count', key: 'count', width: 16 }
    ];
    breakdownSheet.addRows(report.breakdown);
  }
  return workbook.xlsx.writeBuffer();
}

function buildReportCsv(report) {
  const summaryRows = Object.entries(report.summary).map(([metric, value]) => ({ metric, value }));
  const lines = ['metric,value', ...summaryRows.map((r) => `${r.metric},${r.value}`)];
  if (report.breakdown.length) {
    lines.push('', 'group,count', ...report.breakdown.map((b) => `${b.group_key},${b.count}`));
  }
  return lines.join('\n');
}

function generateReport(body) {
  const format = (body?.format || 'json').toString().toLowerCase();
  const report = buildSummary(body);

  if (format === 'json') {
    return { data: report };
  }
  if (format === 'csv') {
    return { data: buildReportCsv(report), format: 'csv' };
  }
  if (format === 'excel' || format === 'xlsx') {
    return { data: report, format: 'excel' };
  }
  return { error: { status: 400, message: 'Unsupported format' } };
}

module.exports = { generateReport, buildReportExcel };
