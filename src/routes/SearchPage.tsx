import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { searchAll } from '../services/searchService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setBookingsSort,
  setDestinationsSort,
  setSearchCategory,
  setSearchDateFrom,
  setSearchDateTo,
  setSearchQuery,
  setSearchStatus,
  setSearchUseFts
} from '../store/searchSlice';

const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Cancelled'];
const BOOKINGS_SORT_OPTIONS = [
  { value: 'date:desc', label: 'Date (newest)' },
  { value: 'date:asc', label: 'Date (oldest)' },
  { value: 'title:asc', label: 'Title (A-Z)' },
  { value: 'status:asc', label: 'Status' },
  { value: 'amount:desc', label: 'Amount (high-low)' }
];
const DESTINATIONS_SORT_OPTIONS = [
  { value: 'name:asc', label: 'Name (A-Z)' },
  { value: 'category:asc', label: 'Category' },
  { value: 'rating:desc', label: 'Rating (high-low)' }
];

function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    query: q,
    useFts,
    status,
    category,
    dateFrom,
    dateTo,
    bookingsSort,
    destinationsSort
  } = useAppSelector((state) => state.search);
  const [results, setResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const doSearch = async (nextPage = 0) => {
    if (!user) {
      setError('Please sign in to search users and itineraries.');
      setResults(null);
      return;
    }

    const query = q.trim();
    if (!query) {
      setError('Enter a search phrase first.');
      setResults(null);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const r = await searchAll(
        query,
        pageSize,
        nextPage * pageSize,
        useFts,
        { status, category, dateFrom, dateTo },
        { bookingsSort, destinationsSort }
      );
      setResults(r);
      setPage(nextPage);
    } catch (err) {
      setError((err as Error).message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const openChatWithUser = (email: string) => {
    navigate(`/chat?user=${encodeURIComponent(email)}`);
  };

  const canGoNext = () => {
    if (!results) return false;
    return (
      results.destinations.length === pageSize ||
      results.trip_plans.length === pageSize ||
      results.bookings.length === pageSize ||
      results.messages.length === pageSize ||
      results.users.length === pageSize
    );
  };

  if (!user) {
    return (
      <section className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">Advanced Search</h1>
        <div className="mt-4 rounded border border-slate-800 bg-slate-900 p-6 text-slate-300">
          <p className="text-slate-100">You need to sign in to search users, itineraries, destinations, and messages.</p>
          <button onClick={() => navigate('/login')} className="mt-4 rounded bg-cyan-400 px-4 py-2 text-slate-900">
            Sign in to search
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Advanced Search</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
        <input
          value={q}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          placeholder="Search destinations, plans, messages, bookings, users"
          className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
        />
        <label className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100">
          <input type="checkbox" checked={useFts} onChange={(e) => dispatch(setSearchUseFts(e.target.checked))} className="h-4 w-4" />
          Use FTS
        </label>
        <button onClick={() => doSearch(0)} className="rounded bg-cyan-400 px-4 py-2 text-slate-900">Search</button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-6">
        <select
          value={status}
          onChange={(e) => dispatch(setSearchStatus(e.target.value))}
          className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
        >
          <option value="">Any booking status</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          value={category}
          onChange={(e) => dispatch(setSearchCategory(e.target.value))}
          placeholder="Destination category"
          className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => dispatch(setSearchDateFrom(e.target.value))}
          className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
          aria-label="Booking date from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => dispatch(setSearchDateTo(e.target.value))}
          className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
          aria-label="Booking date to"
        />
        <select
          value={bookingsSort}
          onChange={(e) => dispatch(setBookingsSort(e.target.value))}
          className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
        >
          {BOOKINGS_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>Bookings: {opt.label}</option>
          ))}
        </select>
        <select
          value={destinationsSort}
          onChange={(e) => dispatch(setDestinationsSort(e.target.value))}
          className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
        >
          {DESTINATIONS_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>Destinations: {opt.label}</option>
          ))}
        </select>
      </div>

      {loading && <div className="mt-4">Searching…</div>}
      {error && <div className="mt-4 text-rose-400">{error}</div>}

      {results && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            <div>Page {page + 1} · {useFts ? 'FTS enabled' : 'Standard search'}</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => doSearch(Math.max(page - 1, 0))}
                disabled={page === 0}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => doSearch(page + 1)}
                disabled={!canGoNext()}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold">Destinations</h3>
              <ul className="mt-2 space-y-2">
                {results.destinations.map((d: any) => (
                  <li key={d.id} className="rounded border border-slate-800 bg-slate-900 p-3 text-slate-200">
                    <div className="text-sm text-slate-400">{d.category || 'General'}</div>
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-sm">{d.location}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">Trip Plans</h3>
              <ul className="mt-2 space-y-2">
                {results.trip_plans.map((t: any) => (
                  <li key={t.id} className="rounded border border-slate-800 bg-slate-900 p-3 text-slate-200">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm">{t.destination} · {t.days} day(s)</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">Bookings</h3>
              <ul className="mt-2 space-y-2">
                {results.bookings.map((b: any) => (
                  <li key={b.id} className="rounded border border-slate-800 bg-slate-900 p-3 text-slate-200">
                    <div className="font-semibold">{b.title}</div>
                    <div className="text-sm">{b.type} · {b.status}</div>
                    <div className="text-xs text-slate-400">{b.date}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">Messages</h3>
              <ul className="mt-2 space-y-2">
                {results.messages.map((m: any) => (
                  <li key={m.id} className="rounded border border-slate-800 bg-slate-900 p-3 text-slate-200">
                    <div className="font-semibold">{m.from_user || m.from}</div>
                    <div className="text-sm truncate">{m.content}</div>
                    <div className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">Users</h3>
              <ul className="mt-2 space-y-2">
                {results.users.map((u: any) => (
                  <li key={u.id} className="rounded border border-slate-800 bg-slate-900 p-3 text-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-sm">{u.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openChatWithUser(u.email)}
                        className="rounded bg-cyan-400 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
                      >
                        Chat
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default SearchPage;
