const ExcelJS = require('exceljs');
const { sqlNow } = require('../utils/dateFormat');
const { generateId } = require('../utils/ids');
const messageRepository = require('../repositories/messageRepository');
const tripPlanRepository = require('../repositories/tripPlanRepository');
const dataPortRepository = require('../repositories/dataPortRepository');
const { findOrCreateDestination } = require('../utils/destinationResolve');
const { resolveUserId } = require('../utils/userResolve');

const EXPORT_TABLES = dataPortRepository.EXPORT_TABLES;

function exportTable(table, format) {
  if (!EXPORT_TABLES.includes(table)) {
    return { error: { status: 400, message: 'Export not supported for this table.' } };
  }

  const rows = dataPortRepository.exportAll(table);

  if (format === 'json') {
    return {
      data: JSON.stringify(rows, null, 2),
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${table}.json"`
      }
    };
  }

  if (format === 'csv') {
    if (!rows || rows.length === 0) {
      return {
        data: '',
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${table}.csv"`
        }
      };
    }
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(',')]
      .concat(rows.map((r) => keys.map((k) => `"${(r[k] || '').toString().replace(/"/g, '""')}"`).join(',')))
      .join('\n');
    return {
      data: csv,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${table}.csv"`
      }
    };
  }

  if (format === 'excel' || format === 'xlsx') {
    return { data: rows, format: 'excel', table };
  }

  return { error: { status: 400, message: 'Unsupported format' } };
}

async function buildExcelBuffer(table, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(table);
  if (rows.length) {
    sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 20 }));
    sheet.addRows(rows);
  }
  return workbook.xlsx.writeBuffer();
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const parseLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());