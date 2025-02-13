const searchRepository = require('../repositories/searchRepository');

function search(query) {
  const q = (query.q || '').toString().trim();
  if (!q) {
    return { error: { status: 400, message: 'Query parameter q is required.' } };
  }

  const data = searchRepository.search({
    q,
    limit: Number(query.limit) || 10,
    offset: Number(query.offset) || 0,
    useFts: query.fts === '1' || query.fts === 'true',
    category: (query.category || '').toString().trim(),
    status: (query.status || '').toString().trim(),
    dateFrom: (query.dateFrom || '').toString().trim(),
    dateTo: (query.dateTo || '').toString().trim(),
    destinationsSort: query.destinationsSort,
    tripPlansSort: query.tripPlansSort,
    bookingsSort: query.bookingsSort,
    messagesSort: query.messagesSort,
    usersSort: query.usersSort
  });

  return { data };
}

module.exports = { search };
