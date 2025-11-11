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