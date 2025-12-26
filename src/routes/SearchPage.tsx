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