import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchFavorites, deleteFavorite, createFavorite, type Favorite } from '../services/favoriteService';
import { fetchSavedPlans, type TripPlan } from '../services/tripPlanStorage';

const TRIP_ENTITY = 'trip_plans';

function resolveTripFavorite(favorite: Favorite, plans: TripPlan[]) {
  const entityId = favorite.entity_id || favorite.target_id || '';
  const plan = plans.find((item) => item.id === entityId);

  if (plan) {
    return {
      title: plan.destination,
      subtitle: `${plan.name} · ${plan.days} day${plan.days === 1 ? '' : 's'} · ${plan.style}`,
      href: `/planner?planId=${encodeURIComponent(plan.id)}`
    };
  }

  return {
    title: 'Saved trip',
    subtitle: 'This trip is no longer in Trip Planner.',
    href: undefined
  };
}

function FavoritesPage() {
  const { user } = useAuth();
  const userEmail = user?.user.email;
  const userId = user?.user.id;

  const [items, setItems] = useState<Favorite[]>([]);
  const [savedPlans, setSavedPlans] = useState<TripPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [favorites, plans] = await Promise.all([
        fetchFavorites(),
        fetchSavedPlans(userEmail)
      ]);
      setItems(favorites);
      setSavedPlans(plans);
    } catch (err) {
      setError((err as Error).message || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const myTripFavorites = useMemo(() => {
    if (!userId) return [];
    return items.filter((item) => {
      if (item.user_id !== userId) return false;
      const entity = item.entity || item.target_table || '';
      return entity === TRIP_ENTITY;
    });
  }, [items, userId]);

  const favoritedPlanIds = useMemo(() => {
    return new Set(
      myTripFavorites.map((item) => item.entity_id || item.target_id || '').filter(Boolean)
    );
  }, [myTripFavorites]);

  const availablePlans = useMemo(
    () => savedPlans.filter((plan) => !favoritedPlanIds.has(plan.id)),
    [savedPlans, favoritedPlanIds]
  );

  const handleCreateFavorite = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!userId) {
      setError('You must sign in to save favorites.');
      return;
    }

    if (!selectedPlanId) {
      setError('Choose a saved trip from Trip Planner.');
      return;
    }

    try {
      const favorite = await createFavorite({
        userId,
        targetTable: TRIP_ENTITY,
        targetId: selectedPlanId
      });
      setItems((current) => [favorite, ...current.filter((item) => item.id !== favorite.id)]);
      setSuccess('Favorite saved.');
      setSelectedPlanId('');
    } catch (err) {
      setError((err as Error).message || 'Failed to save favorite');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove favorite?')) return;
    try {
      await deleteFavorite(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setSuccess('Favorite removed.');
    } catch (err) {
      setError((err as Error).message || 'Delete failed');
    }
  };

  if (loading) return <div className="p-6">Loading favorites…</div>;

  return (
    <section className="mx-auto max-w-4xl p-6">
      <div>
        <h1 className="text-2xl font-semibold">Favorites</h1>
        <p className="mt-2 text-slate-400">
          Pin trips from Trip Planner to open them quickly later.
        </p>
      </div>

      <form onSubmit={handleCreateFavorite} className="mt-6 grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <label className="block">
          <span className="text-sm text-slate-400">Saved trip</span>
          {availablePlans.length > 0 ? (
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100"
            >
              <option value="">Select from your saved trips…</option>
              {availablePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.destination} · {plan.name} ({plan.days} day{plan.days === 1 ? '' : 's'}, {plan.style})
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-2 rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
              {savedPlans.length === 0 ? (
                <>
                  No saved trips yet.{' '}
                  <Link to="/planner" className="text-cyan-300 hover:text-cyan-200">
                    Create one in Trip Planner →
                  </Link>
                </>
              ) : (
                'All saved trips are already in your favorites.'
              )}
            </div>
          )}
        </label>

        <button
          type="submit"
          disabled={availablePlans.length === 0}
          className="w-fit rounded-full bg-cyan-400 px-5 py-3 text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save favorite
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-3xl border border-rose-600 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
      )}
      {success && (
        <div className="mt-4 rounded-3xl border border-emerald-600 bg-emerald-500/10 p-4 text-sm text-emerald-100">{success}</div>
      )}

      {myTripFavorites.length === 0 && (
        <p className="mt-4 text-slate-400">No favorite trips yet.</p>
      )}

      <ul className="mt-4 space-y-3">
        {myTripFavorites.map((item) => {
          const label = resolveTripFavorite(item, savedPlans);
          return (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 p-4"
            >
              <div>
                <p className="font-medium text-slate-100">{label.title}</p>
                <p className="mt-1 text-sm text-slate-400">{label.subtitle}</p>
                {label.href && (
                  <Link to={label.href} className="mt-2 inline-block text-xs text-cyan-300 hover:text-cyan-200">
                    Open in Trip Planner →
                  </Link>
                )}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="rounded-full border border-rose-600 px-3 py-1 text-rose-200"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default FavoritesPage;
