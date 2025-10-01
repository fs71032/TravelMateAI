import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  generateItinerary,
  type ItineraryGeneration,
  type ItineraryRequest
} from '../services/itineraryService';
import { persistPlan } from '../services/tripPlanStorage';
import type { Itinerary } from '../types';

const STYLE_PRESETS = ['Balanced', 'Adventure', 'Culture', 'Relax', 'Food', 'Family'] as const;

type AiRecommendationProps = {
  onSaved?: () => void;
};

function clampDays(value: number) {
  return Math.max(1, Math.min(value, 7));
}

function defaultPlanName(destination: string) {
  const place = destination.trim() || 'Trip';
  return `${place} · AI plan`;
}

function userFacingNotice(message: string | undefined, fallback: string) {
  if (!message?.trim()) {
    return fallback;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes('openstreetmap') ||
    normalized.includes('openai') ||
    normalized.includes('google') ||
    normalized.includes('live map') ||
    normalized.includes('live places') ||
    normalized.includes('built from')
  ) {
    return fallback;
  }

  return message.trim();
}

export default function AiRecommendation({ onSaved }: AiRecommendationProps) {
  const { user } = useAuth();
  const userEmail = user?.user.email;

  const [destination, setDestination] = useState('');
  const [days, setDays] = useState<number | ''>(3);
  const [style, setStyle] = useState('Balanced');
  const [budget, setBudget] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [planName, setPlanName] = useState('');

  const [items, setItems] = useState<Itinerary[]>([]);
  const [source, setSource] = useState<'openai' | 'template' | 'google' | 'google+openai' | 'osm' | 'osm+openai' | 'live' | 'live+openai' | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const requestBase = useMemo((): Omit<ItineraryRequest, 'seed' | 'regenerate'> => ({
    destination: destination.trim(),
    days: days === '' ? 3 : clampDays(days),
    style: style.trim() || 'Balanced',
    budget: budget.trim() || undefined,
    customPrompt: customPrompt.trim() || undefined,
    userEmail,
    planName: planName.trim() || defaultPlanName(destination),
    saveToDatabase: false
  }), [destination, days, style, budget, customPrompt, userEmail, planName]);

  const applyResult = (result: ItineraryGeneration, regenerate = false) => {
    setItems(result.items.map((item) => ({ ...item })));
    setSource(result.source ?? (result.usedFallback ? 'template' : null));
    setSavedPlanId(result.savedPlan?.id || null);

    if (result.savedPlan) {
      setNotice(`Plan "${result.savedPlan.name}" saved successfully.`);
      onSaved?.();
      return;
    }

    const prefix = regenerate ? 'A new plan was generated' : 'Itinerary generated';
    setNotice(userFacingNotice(result.message, `${prefix}. See the preview below.`));
    window.setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  };

  const handleGenerate = async (regenerate = false) => {
    if (!destination.trim()) {
      setError('Enter a destination to generate recommendations.');
      return;
    }

    if (!userEmail) {
      setError('You must be signed in to use the AI planner.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    setSavedPlanId(null);

    try {
      const result = await generateItinerary({
        ...requestBase,
        seed: Date.now(),
        regenerate
      });
      applyResult(result, regenerate);
    } catch (err) {
      setError((err as Error).message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!items.length) {
      setError('Generate an itinerary first.');
      return;
    }
    if (!userEmail) {
      setError('You must be signed in to save the plan.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const saved = await persistPlan({
        id: savedPlanId || undefined,
        name: planName.trim() || defaultPlanName(destination),
        destination: destination.trim(),
        days: days === '' ? 3 : clampDays(days),
        style: style.trim() || 'Balanced',
        budget: budget.trim() || '',
        customPrompt: customPrompt.trim() || '',
        items,
        source: source || 'template',
        userEmail
      });
      setSavedPlanId(saved.id);
      setNotice(`Plan "${saved.name}" saved to Saved trips.`);
      onSaved?.();
    } catch (err) {
      setError((err as Error).message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const plannerUrl = useMemo(() => {