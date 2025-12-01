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