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

      <div className="mt-4">
        <span className="text-sm text-slate-300">Metrics</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {METRIC_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                metrics.includes(option.value) ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 bg-slate-950 text-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={metrics.includes(option.value)}
                onChange={() => toggleMetric(option.value)}
                className="h-4 w-4"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <label className="mt-4 block max-w-xs">
        <span className="text-sm text-slate-300">Breakdown</span>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as ReportGroupBy | '')}
          className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
        >
          {GROUP_BY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={handleGenerate} disabled={loading} className="rounded bg-cyan-400 px-4 py-2 text-slate-900 disabled:opacity-50">
          {loading ? 'Generating…' : 'Generate report'}
        </button>
        <button
          onClick={() => handleExport('csv')}
          disabled={!result || exportingFormat === 'csv'}
          className="rounded border border-slate-700 bg-slate-950 px-4 py-2 text-sm disabled:opacity-50"
        >
          {exportingFormat === 'csv' ? 'Exporting…' : 'Export CSV'}
        </button>
        <button
          onClick={() => handleExport('excel')}
          disabled={!result || exportingFormat === 'excel'}
          className="rounded border border-slate-700 bg-slate-950 px-4 py-2 text-sm disabled:opacity-50"
        >
          {exportingFormat === 'excel' ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      {error && <div className="mt-4 text-rose-400">{error}</div>}

      {result && (
        <div className="mt-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Summary</h2>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(result.summary).map(([metric, value]) => (
                <div key={metric} className="rounded border border-slate-800 bg-slate-900 p-4">
                  <div className="text-sm text-slate-400">{METRIC_OPTIONS.find((m) => m.value === metric)?.label || metric}</div>
                  <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {result.breakdown.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white">Breakdown</h2>
              <table className="mt-2 w-full text-left text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">Group</th>
                    <th className="py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdown.map((row) => (
                    <tr key={row.group_key} className="border-b border-slate-900">
                      <td className="py-2">{row.group_key}</td>
                      <td className="py-2">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ReportsPage;
