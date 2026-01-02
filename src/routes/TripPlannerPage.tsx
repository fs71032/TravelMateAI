import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import type { Itinerary } from '../types';
import { useAuth } from '../auth/AuthContext';
import { generateItinerary, type ItineraryRequest } from '../services/itineraryService';
import { normalizeItineraryItems } from '../utils/itineraryItems';
import {
  fetchSavedPlans,
  clearDraft,
  loadDraft,
  persistPlan,
  removePlan,
  saveDraft,
  type TripPlan
} from '../services/tripPlanStorage';
import { useAppDispatch } from '../store/hooks';
import { setCurrentTripId } from '../store/uiSlice';

const STYLE_PRESETS = ['Balanced', 'Adventure', 'Culture', 'Relax', 'Food', 'Family'] as const;

function clampDays(value: number) {
  return Math.max(1, Math.min(7, value));
}

function formatDaysLabel(days: number | '') {
  return days === '' ? '—' : String(days);
}

function formatPlannedDate(iso?: string) {
  if (!iso?.trim()) return '';
  const date = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function defaultTripName(destination: string, plannedDate: string) {
  const place = destination.trim() || 'Trip';
  const when = formatPlannedDate(plannedDate);
  return when ? `${place} · ${when}` : `${place} trip`;
}

function TripPlannerPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState<number | ''>('');
  const [style, setStyle] = useState('Balanced');
  const [budget, setBudget] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [itineraryItems, setItineraryItems] = useState<Itinerary[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [source, setSource] = useState<'openai' | 'template' | 'google' | 'google+openai' | 'osm' | 'osm+openai' | 'live' | 'live+openai' | null>(null);
  const [savedPlans, setSavedPlans] = useState<TripPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const { user } = useAuth();
  const userEmail = user?.user.email;
  const dispatch = useAppDispatch();

  const selectPlan = (planId: string | null) => {
    setActivePlanId(planId);
    dispatch(setCurrentTripId(planId));
  };

  const applyPlan = useCallback(
    (
      plan: Pick<
        TripPlan,
        'destination' | 'days' | 'style' | 'budget' | 'customPrompt' | 'items' | 'plannedDate'
      > & {
        id?: string;
        name?: string;
        source?: TripPlan['source'];
      }
    ) => {
      setDestination(plan.destination);
      setDays(plan.days > 0 ? clampDays(plan.days) : '');
      setStyle(plan.style || 'Balanced');
      setBudget(plan.budget);
      setCustomPrompt(plan.customPrompt);
      setPlannedDate(plan.plannedDate || '');
      setItineraryItems(normalizeItineraryItems(plan.items));
      setHasGenerated(plan.items.length > 0);
      selectPlan(plan.id ?? null);
      setPlanName(plan.name || defaultTripName(plan.destination, plan.plannedDate || ''));
      setSource(plan.source ?? null);
    },
    []
  );

  useEffect(() => {
    const fromUrl = searchParams.get('destination');
    if (fromUrl) {
      setDestination(fromUrl);
      const urlDays = Number(searchParams.get('days'));
      if (Number.isFinite(urlDays)) setDays(clampDays(urlDays));
      const urlStyle = searchParams.get('style');
      if (urlStyle) setStyle(urlStyle);
      const urlBudget = searchParams.get('budget');
      if (urlBudget) setBudget(urlBudget);
      return;
    }

    const draft = loadDraft();
    if (draft && draft.items.length > 0) {
      applyPlan({
        name: `${draft.destination} trip`,
        ...draft
      });
    }
  }, [searchParams, applyPlan]);

  useEffect(() => {
    if (!userEmail) {
      setSavedPlans([]);
      return;
    }
    fetchSavedPlans(userEmail).then(setSavedPlans);
  }, [userEmail, location.key]);

  useEffect(() => {
    const planId = searchParams.get('planId');
    if (!planId || !savedPlans.length) return;
    const plan = savedPlans.find((entry) => entry.id === planId);
    if (plan) {
      applyPlan(plan);
      setSaveMessage(`Loaded "${plan.name}" from Saved trips.`);
    }
  }, [searchParams, savedPlans, applyPlan]);

  useEffect(() => {
    if (!hasGenerated && itineraryItems.length === 0) return;

    const timer = window.setTimeout(() => {
      saveDraft({
        destination,
        days: days === '' ? 0 : clampDays(days),
        style,
        budget,
        customPrompt,
        plannedDate: plannedDate || undefined,
        items: itineraryItems,
        source: source ?? undefined
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [destination, days, style, budget, customPrompt, plannedDate, itineraryItems, hasGenerated, source]);

  const tripHeadline = useMemo(() => {
    const place = destination.trim() || 'your destination';
    const dayPart = days === '' ? 'Your trip' : `${days}-day trip`;
    const stylePart = style.trim() ? ` · ${style}` : '';
    return `${dayPart}${stylePart} to ${place}`;
  }, [destination, days, style]);

  const buildRequest = (regenerate: boolean): ItineraryRequest | null => {
    if (!destination.trim()) {
      setError(regenerate ? 'Enter a destination first.' : 'Enter a destination, then click Create itinerary.');
      return null;
    }

    const resolvedDays = days === '' ? 3 : clampDays(days);
    const resolvedStyle = style.trim() || 'Balanced';

    if (resolvedDays < 1 || resolvedDays > 7) {
      setError('Days must be between 1 and 7.');
      return null;
    }

    if (days === '') setDays(resolvedDays);
    if (!style.trim()) setStyle(resolvedStyle);

    return {
      destination: destination.trim(),
      days: resolvedDays,
      style: resolvedStyle,
      budget: budget.trim() || undefined,
      customPrompt: customPrompt.trim() || undefined,
      seed: Date.now(),
      regenerate,
      planId: regenerate ? activePlanId || undefined : undefined,
      planName: planName.trim() || defaultTripName(destination, plannedDate),
      plannedDate: plannedDate.trim() || undefined,
      userEmail,
      saveToDatabase: true
    };
  };

  const runGeneration = async (regenerate: boolean) => {
    const usedDefaults = days === '' || !style.trim();
    const request = buildRequest(regenerate);
    if (!request) return;

    setIsGenerating(true);
    setError('');
    setNotice('');
    setSaveMessage('');
    setSource(null);

    try {
      const result = await generateItinerary(request);
      setItineraryItems(normalizeItineraryItems(result.items));
      setHasGenerated(true);
      setSource(result.source ?? null);

      const successNote = regenerate
        ? 'Updated this trip with a new plan version.'
        : usedDefaults
          ? 'Used 3 days and Balanced style — adjust fields and create again to customize.'
          : 'New trip saved to your list.';

      const noticeParts = [successNote];

      if (result.savedPlan) {
        selectPlan(result.savedPlan.id);
        setPlanName(result.savedPlan.name);
        setSavedPlans(await fetchSavedPlans(userEmail));
        noticeParts.push('Saved to database.');
        if (result.usedFallback) {
          noticeParts.push('Planner ran in the browser; backend is connected for saving.');
        }
      } else if (result.usedFallback && result.message) {
        noticeParts.push(result.message);
      } else if (!regenerate && result.message && result.source === 'template') {
        noticeParts.push(result.message);
      }

      setNotice(noticeParts.filter(Boolean).join(' '));

      if (!planName.trim() && !result.savedPlan) {
        setPlanName(defaultTripName(destination, plannedDate));
      }
    } catch (err) {
      setError((err as Error).message || 'Could not generate itinerary.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => runGeneration(false);

  const handleSavePlan = async () => {
    if (!destination.trim()) {
      setError('Enter a destination before saving.');
      return;
    }
    if (!hasGenerated || itineraryItems.length === 0) {
      setError('Create a plan before saving.');
      return;
    }

    if (days === '' || !style.trim()) {
      setError('Enter days and travel style before saving.');
      return;
    }

    const name = planName.trim() || defaultTripName(destination, plannedDate);
    const plan = await persistPlan({
      id: activePlanId || undefined,
      name,
      destination: destination.trim(),
      days: clampDays(days as number),
      style: style.trim(),
      budget,
      customPrompt,
      plannedDate: plannedDate.trim() || undefined,
      items: itineraryItems,
      source: source ?? undefined,
      userEmail
    });

    selectPlan(plan.id);
    setPlanName(plan.name);
    setSaveMessage('Trip saved.');
    setSavedPlans(await fetchSavedPlans(userEmail));
  };

  const handleLoadPlan = (id: string) => {
    const plan = savedPlans.find((p) => p.id === id);
    if (!plan) return;
    applyPlan(plan);
    setSaveMessage(`Loaded "${plan.name}".`);