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
    const params = new URLSearchParams();
    if (destination.trim()) params.set('destination', destination.trim());
    if (days !== '') params.set('days', String(days));
    if (style.trim()) params.set('style', style.trim());
    if (budget.trim()) params.set('budget', budget.trim());
    const query = params.toString();
    return query ? `/planner?${query}` : '/planner';
  }, [destination, days, style, budget]);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm text-slate-400">Destination</span>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Lisbon, Portugal"
            className="mt-2 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-400">Days (1–7)</span>
          <input
            type="number"
            min={1}
            max={7}
            value={days === '' ? '' : days}
            onChange={(e) => setDays(e.target.value === '' ? '' : clampDays(Number(e.target.value)))}
            placeholder="3"
            className="mt-2 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-400">Budget (optional)</span>
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. €1,200"
            className="mt-2 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>

        <div className="block sm:col-span-2">
          <span className="text-sm text-slate-400">Travel style</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setStyle(preset)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  style === preset
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-400'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <label className="block sm:col-span-2">
          <span className="text-sm text-slate-400">AI instructions (optional)</span>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. focus on local food, museums, minimal walking…"
            rows={3}
            className="mt-2 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-600/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      )}
      {notice && !error && (
        <div className="rounded-xl border border-emerald-600/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{notice}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleGenerate(false)}
          disabled={loading || saving}
          className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
        >
          {loading ? 'Generating…' : 'Generate itinerary'}
        </button>
        {items.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={loading || saving}
              className="rounded-full border border-slate-600 bg-slate-950 px-5 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400 disabled:opacity-60"
            >
              {loading ? 'Refreshing…' : 'Try another plan'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || Boolean(savedPlanId)}
              className="rounded-full border border-emerald-600/60 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-60"
            >
              {saving ? 'Saving…' : savedPlanId ? 'Saved ✓' : 'Save plan'}
            </button>
          </>
        )}
      </div>

      {items.length > 0 && !savedPlanId && (
        <label className="block max-w-md">
          <span className="text-sm text-slate-400">Plan name (before saving)</span>
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder={defaultPlanName(destination)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>
      )}

      {items.length > 0 && (
        <div ref={previewRef} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Itinerary preview
            </h3>
            {savedPlanId ? (
              <Link to={`/planner?planId=${savedPlanId}`} className="text-xs text-cyan-300 hover:text-cyan-200">
                View in Saved trips →
              </Link>
            ) : (
              <Link to={plannerUrl} className="text-xs text-cyan-300 hover:text-cyan-200">
                Open in Trip Planner →
              </Link>
            )}
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id || `day-${item.day}`} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-wider text-cyan-400/80">Day {item.day}</p>
                <p className="mt-1 font-semibold text-white">{item.title || `Day ${item.day}`}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-400">{item.details || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
