const { db } = require('../db');

const REPORT_METRIC_TABLES = {
  bookingsCount: { table: 'bookings' },
  tripPlansCount: { table: 'trip_plans' },
  messagesCount: { table: 'messages' },
  notificationsCount: { table: 'notifications' },
  paymentsTotal: { table: 'payments', aggregate: 'SUM(amount) AS s', field: 's' }
};

const REPORT_GROUP_EXPRESSIONS = {
  day: "substr(created_at, 1, 10)",
  month: "strftime('%Y-%m', created_at)",
  status: 'status'
};

function queryMetric(table, aggregate, dateSql, dateParams) {
  return db.prepare(`SELECT ${aggregate} FROM ${table} ${dateSql}`).get(...dateParams);
}

function queryBreakdown(groupExpr, dateSql, dateParams) {
  return db
    .prepare(`SELECT ${groupExpr} AS group_key, COUNT(*) AS count FROM bookings ${dateSql} GROUP BY group_key ORDER BY group_key`)
    .all(...dateParams);
}

module.exports = {
  REPORT_METRIC_TABLES,
  REPORT_GROUP_EXPRESSIONS,
  queryMetric,
  queryBreakdown
};
