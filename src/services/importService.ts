import { authFetch } from './api';

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function importExcelFile(table: string, file: File) {
  const buffer = await file.arrayBuffer();
  const res = await authFetch(`/api/import/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: { 'Content-Type': EXCEL_MIME_TYPE },
    body: buffer
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Import failed');
  }
  return res.json();
}

export async function importFileAsText(table: string, text: string, mimeType: string) {
  const res = await authFetch(`/api/import/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: { 'Content-Type': mimeType },
    body: text
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Import failed');
  }
  return res.json();
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
