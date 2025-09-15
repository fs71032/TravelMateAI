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