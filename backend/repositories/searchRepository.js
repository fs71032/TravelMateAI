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
       WHERE t.id IN (SELECT id FROM trip_plans_fts WHERE trip_plans_fts MATCH ?)
       ORDER BY ${planSort} LIMIT ? OFFSET ?`
    ).all(q, limit, offset);

    messages = db.prepare(
      `SELECT m.id, m.room, fu.email AS from_user, m.content, m.created_at
       FROM messages m
       LEFT JOIN users fu ON fu.id = m.from_user_id
       WHERE m.id IN (SELECT id FROM messages_fts WHERE messages_fts MATCH ?)
       ORDER BY ${msgSort} LIMIT ? OFFSET ?`
    ).all(q, limit, offset);

    bookings = db.prepare(
      `SELECT id, type, title, status, date, amount FROM bookings WHERE (title LIKE ? OR details LIKE ?)${bookingFilterSql}
       ORDER BY ${bookSort} LIMIT ? OFFSET ?`
    ).all(like, like, ...bookingParams, limit, offset);

    users = db.prepare(`
      SELECT id, trim(first_name || ' ' || last_name) AS name, email
      FROM users
      WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
      ORDER BY ${userSort}
      LIMIT ? OFFSET ?
    `).all(like, like, like, limit, offset);
  } else {
    destinations = db.prepare(
      `SELECT d.id, d.name, d.location, d.category, d.description FROM destinations d
       WHERE (d.name LIKE ? OR d.description LIKE ?)${destinationFilterSql}
       ORDER BY ${destSort} LIMIT ? OFFSET ?`
    ).all(like, like, ...destinationParams, limit, offset);

    trip_plans = db.prepare(`
      SELECT t.id, t.name, d.name AS destination, t.days, u.email AS user_email
      FROM trip_plans t
      LEFT JOIN destinations d ON d.id = t.destination_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.name LIKE ? OR d.name LIKE ? OR EXISTS (
        SELECT 1 FROM itinerary_items ii
        WHERE ii.trip_plan_id = t.id AND (ii.title LIKE ? OR ii.details LIKE ?)
      )
      ORDER BY ${planSort} LIMIT ? OFFSET ?
    `).all(like, like, like, like, limit, offset);

    bookings = db.prepare(
      `SELECT id, type, title, status, date, amount FROM bookings WHERE (title LIKE ? OR details LIKE ?)${bookingFilterSql}
       ORDER BY ${bookSort} LIMIT ? OFFSET ?`
    ).all(like, like, ...bookingParams, limit, offset);

    messages = db.prepare(`
      SELECT m.id, m.room, fu.email AS from_user, m.content, m.created_at
      FROM messages m
      LEFT JOIN users fu ON fu.id = m.from_user_id
      WHERE m.content LIKE ?
      ORDER BY ${msgSort} LIMIT ? OFFSET ?
    `).all(like, limit, offset);

    users = db.prepare(`
      SELECT id, trim(first_name || ' ' || last_name) AS name, email
      FROM users
      WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
      ORDER BY ${userSort}
      LIMIT ? OFFSET ?
    `).all(like, like, like, limit, offset);
  }

  return {
    query: q,
    filters: { category: category || null, status: status || null, dateFrom: dateFrom || null, dateTo: dateTo || null },
    sort: {
      destinations: destSort,
      trip_plans: planSort,
      bookings: bookSort,
      messages: msgSort,
      users: userSort
    },
    destinations,
    trip_plans,
    bookings,
    messages,
    users
  };
}

module.exports = { search, resolveSearchSort, SEARCH_SORT_COLUMNS };
