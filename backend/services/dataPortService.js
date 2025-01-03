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
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = vals[j] !== undefined ? vals[j] : '';
    rows.push(obj);
  }
  return rows;
}

async function parseExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { error: { status: 400, message: 'Excel file has no worksheet.' } };

  const headers = [];
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value != null ? cell.value.toString() : '';
      });
      return;
    }
    const obj = {};
    row.eachCell((cell, colNumber) => {
      if (headers[colNumber]) obj[headers[colNumber]] = cell.value != null ? cell.value.toString() : '';
    });
    rows.push(obj);
  });
  return { data: rows };
}

function importRows(table, payload) {
  if (!EXPORT_TABLES.includes(table)) {
    return { error: { status: 400, message: 'Import not supported for this table.' } };
  }
  if (!Array.isArray(payload)) {
    return { error: { status: 400, message: 'Expected JSON array of records.' } };
  }

  let inserted = 0;
  const insertTx = dataPortRepository.runImportTransaction((rows) => {
    for (const row of rows) {
      try {
        if (table === 'destinations') {
          dataPortRepository.importDestination(row, row.id || generateId('dest'));
        } else if (table === 'trip_plans') {
          const id = row.id || generateId('plan');
          const destinationId = row.destination_id || findOrCreateDestination(row.destination || 'Unknown');
          const userId = row.user_id || resolveUserId(row.user_email);
          dataPortRepository.importTripPlan(row, id, destinationId, userId);
          if (Array.isArray(row.items) && row.items.length) {
            tripPlanRepository.syncItineraryItems(id, row.items, userId);
          }
        } else if (table === 'bookings') {
          dataPortRepository.importBooking(row, row.id || generateId('booking'));
        } else if (table === 'messages') {
          messageRepository.insertMessage({
            id: row.id || generateId('msg'),
            room: row.room || 'global',
            from: row.from_user || row.from || 'system',
            to: row.to_user || row.to || null,
            content: row.content || '',
            time: row.created_at || sqlNow()
          });
        } else if (table === 'users') {
          dataPortRepository.importUser(row, row.id || generateId('user'));
        }
        inserted++;
      } catch (e) {
        // skip invalid row
      }
    }
  });

  try {
    insertTx(payload);
    return { data: { inserted } };
  } catch (err) {
    return { error: { status: 500, message: 'Import failed', details: err.message || String(err) } };
  }
}

module.exports = {
  EXPORT_TABLES,
  exportTable,
  buildExcelBuffer,
  parseCsv,
  parseExcelBuffer,
  importRows
};
