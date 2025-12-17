import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { exportReport, generateReport, type ReportGroupBy, type ReportMetric, type ReportResult } from '../services/reportService';

const METRIC_OPTIONS: Array<{ value: ReportMetric; label: string }> = [
  { value: 'bookingsCount', label: 'Bookings created' },
  { value: 'tripPlansCount', label: 'Trip plans created' },
  { value: 'messagesCount', label: 'Messages sent' },
  { value: 'notificationsCount', label: 'Notifications sent' },
  { value: 'paymentsTotal', label: 'Payments total' }
];

const GROUP_BY_OPTIONS: Array<{ value: ReportGroupBy | ''; label: string }> = [
  { value: '', label: 'No breakdown' },
  { value: 'day', label: 'Bookings by day' },
  { value: 'month', label: 'Bookings by month' },
  { value: 'status', label: 'Bookings by status' }
];

function ReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [metrics, setMetrics] = useState<ReportMetric[]>(METRIC_OPTIONS.map((m) => m.value));
  const [groupBy, setGroupBy] = useState<ReportGroupBy | ''>('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const toggleMetric = (metric: ReportMetric) => {
    setMetrics((prev) => (prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]));
  };

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const report = await generateReport({ startDate, endDate, metrics, groupBy });
      setResult(report);
    } catch (err) {
      setError((err as Error).message || 'Report generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    setError('');
    setExportingFormat(format);
    try {
      await exportReport({ startDate, endDate, metrics, groupBy }, format);
    } catch (err) {
      setError((err as Error).message || 'Report export failed');
    } finally {
      setExportingFormat(null);
    }
  };

  if (!user) {
    return (
      <section className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="mt-4 rounded border border-slate-800 bg-slate-900 p-6 text-slate-300">
          <p className="text-slate-100">Sign in to generate activity reports.</p>
          <button onClick={() => navigate('/login')} className="mt-4 rounded bg-cyan-400 px-4 py-2 text-slate-900">
            Sign in
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-slate-400">Generate a dynamic activity report by date range, metrics, and breakdown.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-300">From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">To</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>
      </div>
