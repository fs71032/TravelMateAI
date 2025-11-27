import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Destination } from '../types';
import { fetchDestinations } from '../services/destinationService';
import { createFavorite } from '../services/favoriteService';

function DestinationsPage() {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [favoriteError, setFavoriteError] = useState('');

  useEffect(() => {
    fetchDestinations()
      .then(setDestinations)
      .catch((err) => {
        setError((err as Error).message || 'Could not load destinations. Run: npm run backend');
        setDestinations([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFavorite = async (destinationId: string) => {
    setSuccessMessage('');
    setFavoriteError('');
    if (!user) {
      setFavoriteError('Sign in to save favorites.');
      return;
    }

    try {
      await createFavorite({
        userId: user.user.id,
        targetTable: 'destinations',
        targetId: destinationId
      });
      setSuccessMessage('Destination added to favorites.');
    } catch (err) {
      setFavoriteError((err as Error).message || 'Failed to save favorite');
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Destination discovery</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Curated places for every travel style.</h1>
        </div>
        {user ? (
          <div className="rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm text-slate-200">
            Signed in as {user.user.name}
          </div>
        ) : (
          <div className="rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm text-slate-200">
            Sign in to save favorites
          </div>
        )}
      </div>

      {error && (