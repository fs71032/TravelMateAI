const { db } = require('../db');
const { sqlDate } = require('../utils/dateFormat');

const SEARCH_SORT_COLUMNS = {
  destinations: { name: 'd.name', category: 'd.category', rating: 'd.rating' },
  trip_plans: { name: 't.name', days: 't.days' },
  bookings: { date: 'date', title: 'title', status: 'status', amount: 'amount' },
  messages: { created_at: 'm.created_at' },
  users: { name: "trim(first_name || ' ' || last_name)", email: 'email' }
};

function resolveSearchSort(entity, sortParam, defaultColumn, defaultDir = 'ASC') {
  const columns = SEARCH_SORT_COLUMNS[entity];
  const [rawColumn, rawDir] = (sortParam || '').toString().split(':');
  const column = columns[rawColumn] || columns[defaultColumn];
  const direction = rawDir && rawDir.toUpperCase() === 'DESC' ? 'DESC' : rawDir && rawDir.toUpperCase() === 'ASC' ? 'ASC' : defaultDir;
  return `${column} ${direction}`;
}

function search(params) {
  const {
    q,
    limit = 10,
    offset = 0,
    useFts = false,
    category = '',
    status = '',
    dateFrom = '',
    dateTo = '',
    destinationsSort,
    tripPlansSort,
    bookingsSort,
    messagesSort,
    usersSort
  } = params;

  const like = `%${q.replace(/%/g, '')}%`;
  const destSort = resolveSearchSort('destinations', destinationsSort, 'name');
  const planSort = resolveSearchSort('trip_plans', tripPlansSort, 'name');
  const bookSort = resolveSearchSort('bookings', bookingsSort, 'date', 'DESC');
  const msgSort = resolveSearchSort('messages', messagesSort, 'created_at', 'DESC');
  const userSort = resolveSearchSort('users', usersSort, 'name');

  const bookingFilters = [];
  const bookingParams = [];
  if (status) {
    bookingFilters.push('status = ?');
    bookingParams.push(status);
  }
  if (dateFrom) {
    bookingFilters.push('date >= ?');
    bookingParams.push(sqlDate(dateFrom));
  }
  if (dateTo) {
    bookingFilters.push('date <= ?');
    bookingParams.push(sqlDate(dateTo));
  }
  const bookingFilterSql = bookingFilters.length ? ` AND ${bookingFilters.join(' AND ')}` : '';

  const destinationFilters = [];
  const destinationParams = [];
  if (category) {
    destinationFilters.push('d.category = ?');
    destinationParams.push(category);
  }
  const destinationFilterSql = destinationFilters.length ? ` AND ${destinationFilters.join(' AND ')}` : '';

  let destinations = [];
  let trip_plans = [];
  let bookings = [];
  let messages = [];
  let users = [];

  if (useFts) {
    destinations = db.prepare(
      `SELECT d.id, d.name, d.location, d.category, d.description FROM destinations d
       WHERE d.id IN (SELECT id FROM destinations_fts WHERE destinations_fts MATCH ?)${destinationFilterSql}
       ORDER BY ${destSort} LIMIT ? OFFSET ?`
    ).all(q, ...destinationParams, limit, offset);

    trip_plans = db.prepare(
      `SELECT t.id, t.name, d.name AS destination, t.days, u.email AS user_email
       FROM trip_plans t
       LEFT JOIN destinations d ON d.id = t.destination_id
       LEFT JOIN users u ON u.id = t.user_id