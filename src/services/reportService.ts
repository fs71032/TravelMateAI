import { authFetch } from './api';

export type ReportMetric = 'bookingsCount' | 'tripPlansCount' | 'messagesCount' | 'notificationsCount' | 'paymentsTotal';
export type ReportGroupBy = 'day' | 'month' | 'status';

export type ReportCriteria = {
  startDate?: string;
  endDate?: string;
  metrics?: ReportMetric[];
  groupBy?: ReportGroupBy | '';
};

export type ReportResult = {
  startDate: string | null;
  endDate: string | null;
  groupBy: string | null;
  metrics: string[];
  summary: Record<string, number>;
  breakdown: Array<{ group_key: string; count: number }>;
};

export async function generateReport(criteria: ReportCriteria): Promise<ReportResult> {
  const res = await authFetch('/api/reports/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...criteria, format: 'json' })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Report generation failed');
  }
  return res.json();
}

export async function exportReport(criteria: ReportCriteria, format: 'csv' | 'excel') {
  const res = await authFetch('/api/reports/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...criteria, format })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Report export failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report.${format === 'excel' ? 'xlsx' : 'csv'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
