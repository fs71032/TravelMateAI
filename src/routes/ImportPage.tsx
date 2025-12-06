import { useState } from 'react';
import { importExcelFile, importFileAsText } from '../services/importService';
import { exportTable } from '../services/exportService';

const tables = ['destinations','trip_plans','bookings','messages','users'];
const exportFormats: Array<'json' | 'csv' | 'excel'> = ['json', 'csv', 'excel'];

function ImportPage() {
  const [table, setTable] = useState(tables[0]);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportTableName, setExportTableName] = useState(tables[0]);
  const [exportError, setExportError] = useState('');
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!file) return setError('Select a file');
    setLoading(true);
    try {
      const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const res = isExcel
        ? await importExcelFile(table, file)
        : await importFileAsText(table, await file.text(), file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/json'));
      setResult(res);
    } catch (err) {
      setError((err as Error).message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'excel') => {
    setExportError('');
    setExportingFormat(format);
    try {
      await exportTable(exportTableName, format);
    } catch (err) {
      setExportError((err as Error).message || 'Export failed');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <section className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Import data</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label>
          Table
          <select value={table} onChange={(e) => setTable(e.target.value)} className="ml-2 rounded bg-slate-900 border border-slate-800 px-3 py-2">
            {tables.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>
          File
          <input
            type="file"
            accept=".json,.csv,.xlsx,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="ml-2"
          />
        </label>
        <div>
          <button type="submit" disabled={loading} className="rounded bg-cyan-400 px-4 py-2">Import</button>
        </div>
      </form>
      {loading && <div className="mt-4">Importing…</div>}
      {error && <div className="mt-4 text-rose-400">{error}</div>}
      {result && <pre className="mt-4 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>}

      <h2 className="mt-10 text-xl font-semibold">Export data</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label>
          Table
          <select
            value={exportTableName}
            onChange={(e) => setExportTableName(e.target.value)}
            className="ml-2 rounded bg-slate-900 border border-slate-800 px-3 py-2"
          >
            {tables.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        {exportFormats.map((format) => (
          <button
            key={format}
            type="button"
            disabled={exportingFormat === format}
            onClick={() => handleExport(format)}
            className="rounded border border-slate-700 bg-slate-950 px-4 py-2 uppercase text-sm disabled:opacity-50"
          >
            {exportingFormat === format ? 'Exporting…' : format}
          </button>
        ))}
      </div>
      {exportError && <div className="mt-4 text-rose-400">{exportError}</div>}
    </section>
  );
}

export default ImportPage;
