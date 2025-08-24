import { authFetch } from './api';

const EXPORT_EXTENSIONS: Record<string, string> = {
  json: 'json',
  csv: 'csv',
  excel: 'xlsx'
};

export async function exportTable(table: string, format: 'json' | 'csv' | 'excel' = 'json') {
  const res = await authFetch(`/api/export/${encodeURIComponent(table)}?format=${format}`);
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${table}.${EXPORT_EXTENSIONS[format]}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importJson(table: string, data: any[]) {
  const res = await authFetch(`/api/import/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Import failed');
  }
  return res.json();
}
