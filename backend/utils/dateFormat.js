function pad(value) {
  return String(value).padStart(2, '0');
}

function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
      return new Date(text.replace(' ', 'T'));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return new Date(`${text}T12:00:00`);
    }
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

/** SQLite timestamp: 2026-06-08 17:30:45 */
function sqlNow(value = new Date()) {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** SQLite date-only value: 2026-06-08 */
function sqlDate(value) {
  if (value == null || value === '') {
    return null;
  }

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeTimestamp(value) {
  if (value == null || value === '') {
    return sqlNow();
  }

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text} 00:00:00`;
  }

  if (text.includes('T')) {
    return text.replace('T', ' ').replace(/\.\d{3}Z?$/, '').replace(/Z$/, '').slice(0, 19);
  }

  return sqlNow(text);
}

function normalizeDate(value) {
  if (value == null || value === '') {
    return null;
  }

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{4}-\d{2}-\d{2} /.test(text)) {
    return text.slice(0, 10);
  }

  if (text.includes('T')) {
    return text.slice(0, 10);
  }

  return sqlDate(text);
}

function isExpired(expiresAt) {
  if (!expiresAt) {
    return true;
  }

  const date = toDate(expiresAt);
  return date.getTime() < Date.now();
}

function addDays(days, from = new Date()) {
  const date = toDate(from);
  date.setDate(date.getDate() + days);
  return sqlNow(date);
}

function normalizeStoredDates(db) {
  const timestampColumns = [
    ['users', ['created_at', 'updated_at']],
    ['permissions', ['created_at', 'updated_at']],
    ['roles', ['created_at', 'updated_at']],
    ['settings', ['created_at', 'updated_at']],
    ['refresh_tokens', ['created_at', 'updated_at', 'expires_at', 'revoked_at']],
    ['role_permissions', ['created_at', 'updated_at']],
    ['user_roles', ['created_at', 'updated_at', 'assigned_at']],
    ['chat_rooms', ['created_at', 'updated_at']],
    ['messages', ['created_at', 'updated_at']],
    ['destinations', ['created_at', 'updated_at']],
    ['guides', ['created_at', 'updated_at']],
    ['travel_groups', ['created_at', 'updated_at']],
    ['booking_suppliers', ['created_at', 'updated_at']],
    ['trip_plans', ['created_at', 'updated_at']],
    ['itinerary_items', ['created_at', 'updated_at']],
    ['bookings', ['created_at', 'updated_at']],
    ['invoices', ['created_at', 'updated_at', 'issued_at']],
    ['payments', ['created_at', 'updated_at', 'paid_at']],
    ['files', ['created_at', 'updated_at']],
    ['reviews', ['created_at', 'updated_at']],
    ['favorites', ['created_at', 'updated_at']],
    ['group_members', ['created_at', 'updated_at', 'joined_at']],
    ['notifications', ['created_at', 'updated_at']],
    ['audit_logs', ['created_at', 'updated_at']]
  ];

  const dateColumns = [
    ['trip_plans', ['planned_date']],
    ['bookings', ['date']],
    ['invoices', ['due_date']]
  ];

  let updated = 0;

  for (const [table, columns] of timestampColumns) {
    for (const column of columns) {
      const rows = db.prepare(`SELECT rowid AS _rowid, ${column} AS value FROM ${table} WHERE ${column} LIKE '%T%' OR ${column} LIKE '%.%'`).all();
      const stmt = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE rowid = ?`);
      for (const row of rows) {
        stmt.run(normalizeTimestamp(row.value), row._rowid);
        updated += 1;
      }
    }
  }

  for (const [table, columns] of dateColumns) {
    for (const column of columns) {
      const rows = db
        .prepare(`SELECT rowid AS _rowid, ${column} AS value FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != '' AND length(${column}) > 10`)
        .all();
      const stmt = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE rowid = ?`);
      for (const row of rows) {
        stmt.run(normalizeDate(row.value), row._rowid);
        updated += 1;
      }
    }
  }

  if (updated > 0) {
    console.log(`[db] simplified ${updated} date value(s) to YYYY-MM-DD / YYYY-MM-DD HH:MM:SS`);
  }
}

module.exports = {
  sqlNow,
  sqlDate,
  normalizeTimestamp,
  normalizeDate,
  isExpired,
  addDays,
  normalizeStoredDates
};
