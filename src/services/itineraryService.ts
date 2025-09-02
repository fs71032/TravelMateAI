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

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const { data } = await readResponseBody<T>(response);
  return data ?? ({} as T);
}

export async function fetchItineraryStatus(): Promise<ItineraryStatus | null> {
  try {
    const response = await authFetch('/api/itinerary/status');
    if (!response.ok) {
      return null;
    }
    return await parseJsonResponse<ItineraryStatus>(response);
  } catch {
    return null;
  }
}

function isOfflineError(error: unknown): boolean {
  const message = (error as Error).message?.toLowerCase() || '';
  return (
    error instanceof TypeError ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('load failed')
  );
}

async function savePlanToDatabase(
  request: ItineraryRequest,
  result: Pick<ItineraryGeneration, 'items' | 'source'>
) {
  const { persistPlan } = await import('./tripPlanStorage');
  return persistPlan({
    id: request.planId,
    name: request.planName || `${request.destination} trip`,
    destination: request.destination,
    days: request.days,
    style: request.style,
    budget: request.budget || '',
    customPrompt: request.customPrompt || '',
    items: result.items,
    source: result.source,
    userEmail: request.userEmail,
    plannedDate: request.plannedDate
  });
}

function sanitizePlannerMessage(message?: string) {
  if (!message?.trim()) {
    return undefined;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes('openai request failed') ||
    normalized.includes('invalid_api_key') ||
    normalized.includes('incorrect api key') ||
    normalized.includes('sk-your')
  ) {
    return undefined;
  }

  return message.trim();
}

function plannerError(response: Response, data: { message?: string } | null) {
  if (response.status === 401) {
    return 'Your session expired. Sign out and sign in again, then try Generate.';
  }
  const safeMessage = sanitizePlannerMessage(data?.message);
  if (safeMessage) {
    return safeMessage;
  }
  if (response.status >= 500) {
    return 'The planner server is not responding. Restart the backend (npm start).';
  }
  return 'Could not generate the itinerary. Make sure the backend is running on port 4000.';
}

export async function generateItinerary(request: ItineraryRequest): Promise<ItineraryGeneration> {
  const shouldSave = request.saveToDatabase !== false;

  try {
    const response = await authFetch('/api/itinerary/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const { data, isJson } = await readResponseBody<
      ItineraryGeneration & { message?: string; savedPlan?: TripPlan }
    >(response);

    if (data && Array.isArray(data.items) && data.items.length > 0) {
      const normalized = normalizeItineraryItems(data.items);
      if (itemsHaveRealContent(normalized)) {
        return {
          prompt: data.prompt || '',
          items: normalized,
          source: data.source,
          aiEnabled: data.aiEnabled,
          livePlacesEnabled: data.livePlacesEnabled,
          openStreetMapEnabled: data.openStreetMapEnabled,
          googleEnabled: data.googleEnabled,
          message: sanitizePlannerMessage(data.message),
          usedFallback: false,
          savedPlan: data.savedPlan
        };
      }
    }

    if (!response.ok || !isJson) {
      throw new Error(plannerError(response, data));
    }

    throw new Error(
      sanitizePlannerMessage(data?.message) ||
        'The planner returned an empty response. Try again or change the destination.'
    );
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : '';
    if (
      errMessage.toLowerCase().includes('openai') ||
      errMessage.toLowerCase().includes('invalid_api_key')
    ) {
      throw new Error(
        'OpenAI is not configured. Itineraries use live map data and curated profiles — restart the backend (npm start) and try again.'
      );
    }
    if (shouldSave && isOfflineError(error)) {
      const local = {
        ...generateItineraryLocal(request),
        source: 'template' as const,
        aiEnabled: false,
        usedFallback: true,
        message:
          'Backend unavailable — an offline plan was created. Start the backend for live map places.'
      };
      try {
        local.savedPlan = await savePlanToDatabase(request, local);
      } catch {
        // keep offline plan without DB save
      }
      return local;
    }

    throw error instanceof Error
      ? error
      : new Error('Generation failed. Restart the backend and try again.');
  }
}
