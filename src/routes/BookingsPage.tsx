import { useCallback, useEffect, useState } from 'react';
import type { Booking } from '../types';
import { useAuth } from '../auth/AuthContext';
import {
  createBooking,
  deleteBooking,
  fetchBookings,
  updateBookingStatus
} from '../services/bookingService';
import { createNotification } from '../services/notificationService';

const emptyForm = {
  type: 'Hotel',
  title: '',
  date: '',
  amount: '',
  location: '',
  details: ''
};

function BookingsPage() {
  const { user } = useAuth();
  const userEmail = user?.user.email;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(await fetchBookings());
      setError('');
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch bookings. Run: npm run backend');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const pushNotification = (title: string, message: string) => {
    if (!userEmail) return;
    createNotification({ type: 'booking', title, message, userEmail }).catch(() => {});
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;

    setBusyId(id);
    setError('');
    try {
      await deleteBooking(id);
      setBookings((current) => current.filter((b) => b.id !== id));
      pushNotification('Booking removed', `"${title}" was deleted.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setBusyId(id);
    setError('');
    try {
      const updated = await updateBookingStatus(id, status);
      setBookings((current) => current.map((b) => (b.id === id ? updated : b)));
      pushNotification('Booking updated', `"${updated.title}" is now ${status}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      setError('Title and date are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await createBooking(formData);
      setFormData(emptyForm);
      setShowForm(false);
      pushNotification('New booking', `"${created.title}" was added.`);
      await loadBookings();
    } catch (err) {
      setError((err as Error).message || 'Failed to create booking. Run: npm run backend');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const pendingCount = bookings.filter((b) => b.status === 'Pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'Confirmed').length;
  const totalAmount = bookings.reduce((sum, b) => {
    const amt = parseFloat(b.amount?.replace(/[^0-9.-]/g, '') || '0');
    return sum + amt;
  }, 0);

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Booking management</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Track reservations and approvals.</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          {showForm ? 'Cancel' : 'New booking'}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-3xl border border-rose-600 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
          <h3 className="mb-4 text-xl font-semibold text-white">Create new booking</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option>Hotel</option>
                  <option>Flight</option>
                  <option>Experience</option>
                  <option>Transport</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Suite reservation in Barcelona"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Amount</label>
                <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="e.g., €2,240"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Barcelona, Spain"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Details</label>
              <textarea
                name="details"
                value={formData.details}
                onChange={handleChange}
                placeholder="Brief description of the booking"
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Create booking'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400">Loading bookings...</div>
      ) : (