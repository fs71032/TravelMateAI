import type { Itinerary } from '../types';
import { authFetch } from './api';

export type TripPlan = {
  id: string;
  name: string;
  destination: string;
  days: number;
  style: string;
  budget: string;
  customPrompt: string;
  items: Itinerary[];
  updatedAt: string;
  source?: 'openai' | 'template' | 'google' | 'google+openai' | 'osm' | 'osm+openai' | 'live' | 'live+openai';
  userEmail?: string;
  /** ISO date (YYYY-MM-DD) when the trip is planned */
  plannedDate?: string;
};

export type TripPlanDraft = Omit<TripPlan, 'id' | 'name' | 'updatedAt'>;

const DRAFT_KEY = 'travelmate_itinerary_draft';
const PLANS_KEY = 'travelmate_saved_plans';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadDraft(): TripPlanDraft | null {
  return readJson<TripPlanDraft | null>(DRAFT_KEY, null);
}

export function saveDraft(draft: TripPlanDraft) {
  writeJson(DRAFT_KEY, draft);
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() || '';
}

export function clearSavedPlansCache() {
  localStorage.removeItem(PLANS_KEY);
}

export function listLocalPlans(userEmail?: string): TripPlan[] {
  const normalized = normalizeEmail(userEmail);
  let plans = readJson<TripPlan[]>(PLANS_KEY, []);
  if (normalized) {
    plans = plans.filter(
      (plan) => plan.userEmail && plan.userEmail.trim().toLowerCase() === normalized
    );
  }
  return plans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function saveLocalPlan(input: Omit<TripPlan, 'id' | 'updatedAt'> & { id?: string }): TripPlan {
  const plans = listLocalPlans();
  const now = new Date().toISOString();
  const plan: TripPlan = {
    id: input.id || `plan-${Date.now()}`,
    name: input.name,
    destination: input.destination,
    days: input.days,
    style: input.style,
    budget: input.budget,
    customPrompt: input.customPrompt,
    items: input.items,
    source: input.source,
    userEmail: input.userEmail ? normalizeEmail(input.userEmail) : undefined,
    plannedDate: input.plannedDate?.trim() || undefined,
    updatedAt: now
  };

  const index = plans.findIndex((p) => p.id === plan.id);
  if (index >= 0) {
    plans[index] = plan;
  } else {
    plans.unshift(plan);
  }

  writeJson(PLANS_KEY, plans);
  return plan;
}

export function deleteLocalPlan(id: string) {
  writeJson(
    PLANS_KEY,
    listLocalPlans().filter((p) => p.id !== id)
  );
}

export async function fetchSavedPlans(userEmail?: string): Promise<TripPlan[]> {
  const normalized = normalizeEmail(userEmail);

  if (!normalized) {
    return listLocalPlans();
  }

  try {
    const response = await authFetch(
      `/api/itinerary/plans?userEmail=${encodeURIComponent(normalized)}`
    );
    if (response.ok) {
      const data = (await response.json()) as TripPlan[];
      if (Array.isArray(data)) {
        writeJson(PLANS_KEY, data);
        return data;
      }
    }
  } catch {
    // use local copy filtered by user
  }
  return listLocalPlans(normalized);
}

export async function persistPlan(
  plan: Omit<TripPlan, 'id' | 'updatedAt'> & { id?: string; updatedAt?: string }
): Promise<TripPlan> {
  const withMeta: TripPlan = {
    ...plan,
    id: plan.id || `plan-${Date.now()}`,
    updatedAt: plan.updatedAt || new Date().toISOString(),
    userEmail: plan.userEmail ? normalizeEmail(plan.userEmail) : undefined
  };

  if (!withMeta.userEmail) {
    return saveLocalPlan(withMeta);
  }

  try {
    const response = await authFetch('/api/itinerary/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withMeta)
    });

    if (response.ok) {
      const saved = (await response.json()) as TripPlan;
      saveLocalPlan(saved);
      return saved;
    }

    let message = 'Could not save the plan on the server.';
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') {
      throw error;
    }
    saveLocalPlan(withMeta);
    throw new Error('Could not connect to the server. Make sure the backend is running.');
  }
}

export async function removePlan(id: string): Promise<void> {
  deleteLocalPlan(id);
  try {
    await authFetch(`/api/itinerary/plans/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    // local already removed
  }
}

export function formatPlanExport(plan: Pick<TripPlan, 'destination' | 'days' | 'style' | 'budget' | 'items'>): string {
  const header = `${plan.destination} · ${plan.days} days · ${plan.style} · ${plan.budget}\n${'—'.repeat(40)}\n`;
  const body = plan.items
    .map((item) => `Day ${item.day}: ${item.title}\n${item.details}`)
    .join('\n\n');
  return header + body;
}
