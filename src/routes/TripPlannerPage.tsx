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