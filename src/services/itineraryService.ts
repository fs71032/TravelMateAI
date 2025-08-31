import type { Itinerary } from '../types';
import type { TripPlan } from './tripPlanStorage';
import { authFetch } from './api';
import { normalizeItineraryItems } from '../utils/itineraryItems';
import { getVariantDetails, getVariantTitle } from '../utils/itineraryVariations';

export type ItineraryRequest = {
  destination: string;
  days: number;
  style: string;
  budget?: string;
  customPrompt?: string;
  /** Changes on each Generate / Regenerate so AI returns a fresh plan */
  seed?: number;
  /** True when user clicks "Try another plan" */
  regenerate?: boolean;
  planId?: string;
  planName?: string;
  userEmail?: string;
  plannedDate?: string;
  saveToDatabase?: boolean;
};

export type ItineraryGeneration = {
  prompt: string;
  items: Itinerary[];
  source?: 'openai' | 'template' | 'google' | 'google+openai' | 'osm' | 'osm+openai' | 'live' | 'live+openai';
  aiEnabled?: boolean;
  googleEnabled?: boolean;
  livePlacesEnabled?: boolean;
  openStreetMapEnabled?: boolean;
  message?: string;
  /** True when the built-in planner was used instead of the server/AI */
  usedFallback?: boolean;
  savedPlan?: TripPlan;
};

export type ItineraryStatus = {
  aiEnabled: boolean;
  livePlacesEnabled: boolean;
  openStreetMapEnabled: boolean;
  googlePlacesEnabled: boolean;
  model: string;
};

export function buildItineraryPrompt(request: ItineraryRequest): string {
  const dest = request.destination.trim() || 'the destination';
  const travelStyle = request.style.trim() || 'balanced';
  const dayCount = Math.max(1, Math.min(request.days || 3, 7));
  const budgetLine = request.budget?.trim() ? `Total budget guideline: ${request.budget.trim()}.` : '';
  const extra = request.customPrompt?.trim() ? `Guest requirements: ${request.customPrompt.trim()}` : '';
  const regenerateLine = request.seed
    ? `Regeneration id ${request.seed}: create a distinctly different route — other neighborhoods and restaurants.`
    : '';

  return [
    `Plan a ${dayCount}-day ${travelStyle.toLowerCase()} trip to ${dest}.`,
    budgetLine,
    extra,
    regenerateLine,
    '',
    'Use real venue names, timed blocks (09:00–11:00), geographic clustering, and one local tip per day.',
    'The itinerary must read like a professional local guide — not generic filler.'
  ]
    .filter(Boolean)
    .join('\n');
}

function getLocalStyleDescription(style: string) {
  const normalized = style.trim().toLowerCase();
  if (normalized.includes('relax') || normalized.includes('chill')) {
    return 'a relaxed schedule with spa, beach time, and slow city walks';
  }
  if (normalized.includes('adventure') || normalized.includes('active')) {
    return 'an action-packed route with outdoor adventure, hiking, and discovery';
  }
  if (normalized.includes('culture') || normalized.includes('local')) {
    return 'a cultural itinerary focusing on museums, markets, and heritage sites';
  }
  if (normalized.includes('food') || normalized.includes('culinary')) {
    return 'a food-focused route with local restaurants, markets, and tasting experiences';
  }
  if (normalized.includes('family')) {
    return 'a family-friendly plan with shorter transfers and activities for mixed ages';
  }
  return 'a balanced trip with highlights, dining, and downtime';
}

function isGenericFiller(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('explore the best of') ||
    normalized.includes('visit local favorites and landmarks with time for a short break')
  );
}

function itemsHaveRealContent(items: Itinerary[]): boolean {
  return items.some((item) => {
    const text = `${item.title || ''} ${item.details || ''}`.trim();
    return text.length > 80 && !isGenericFiller(text);
  });
}

export function generateItineraryLocal(request: ItineraryRequest): ItineraryGeneration {
  const days = Math.max(1, Math.min(request.days || 3, 7));
  const stamp = request.seed ?? Date.now();
  const destination = request.destination.trim() || 'your destination';
  const styleDesc = getLocalStyleDescription(request.style || 'Balanced');
  const budgetNote = request.budget ? ` Budget target: ${request.budget}.` : '';
  const focusNote = request.customPrompt ? ` Guest request: ${request.customPrompt}.` : '';

  const items = Array.from({ length: days }, (_, index) => {
    const dayNumber = index + 1;
    return {
      id: `local-${stamp}-${dayNumber}`,
      day: dayNumber,
      title: getVariantTitle(dayNumber, stamp),
      details: getVariantDetails({
        day: dayNumber,
        destination,
        styleDesc,
        budgetNote,
        focusNote,
        seed: stamp
      })
    };
  });

  return {
    prompt: buildItineraryPrompt({ ...request, days }),
    items: normalizeItineraryItems(items)
  };
}

async function readResponseBody<T>(response: Response): Promise<{ data: T | null; isJson: boolean }> {
  const text = await response.text();
  if (!text.trim()) {
    return { data: null, isJson: false };
  }

  const contentType = response.headers.get('content-type') || '';
  const looksLikeJson = contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[');

  if (!looksLikeJson) {
    return { data: null, isJson: false };
  }

  try {
    return { data: JSON.parse(text) as T, isJson: true };
  } catch {
    return { data: null, isJson: false };
  }
}