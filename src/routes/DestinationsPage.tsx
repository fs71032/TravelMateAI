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
        <div className="mb-6 rounded-3xl border border-rose-600 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {(successMessage || favoriteError) && (
        <div className="mb-6 space-y-3">
          {successMessage && (
            <div className="rounded-3xl border border-emerald-600 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {successMessage}
            </div>
          )}
          {favoriteError && (
            <div className="rounded-3xl border border-rose-600 bg-rose-500/10 p-4 text-sm text-rose-200">
              {favoriteError}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400">Loading destinations...</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {destinations.map((destination) => (
            <article key={destination.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{destination.category}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{destination.name}</h2>
                </div>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-300">{destination.price}</span>
              </div>
              <p className="text-slate-400">{destination.location}</p>
              {destination.description && <p className="mt-3 text-sm text-slate-500">{destination.description}</p>}
              <div className="mt-6 flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <span>{destination.rating} ★</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    to={`/planner?destination=${encodeURIComponent(destination.name)}`}
                    className="rounded-full border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs transition hover:border-cyan-400"
                  >
                    Plan trip
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleFavorite(destination.id)}
                    className="rounded-full border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300 transition hover:bg-cyan-500/20"
                  >
                    Save favorite
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default DestinationsPage;
