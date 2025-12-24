import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchReviews, deleteReview, createReview, type Review } from '../services/reviewService';

function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [targetTable, setTargetTable] = useState('destinations');
  const [targetId, setTargetId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    fetchReviews()
      .then((data) => {
        if (!active) return;
        setReviews(data);
      })
      .catch((err) => setError(err.message || 'Failed to load reviews'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const handleCreateReview = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!user) {
      setError('You must sign in to submit reviews.');
      return;
    }
    if (!targetId.trim()) {
      setError('Enter a valid target ID.');
      return;
    }

    try {
      const review = await createReview({
        targetTable,
        targetId: targetId.trim(),
        userId: user.user.id,
        rating,
        comment: comment.trim() || undefined
      });
      setReviews((cur) => [review, ...cur]);
      setSuccess('Review added.');
      setTargetId('');
      setComment('');
      setRating(5);
    } catch (err) {
      setError((err as Error).message || 'Failed to submit review');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete review?')) return;
    try {
      await deleteReview(id);
      setReviews((cur) => cur.filter((r) => r.id !== id));
      setSuccess('Review deleted.');
    } catch (err) {
      setError((err as Error).message || 'Delete failed');
    }
  };

  if (loading) return <div className="p-6">Loading reviews…</div>;

  return (
    <section className="mx-auto max-w-4xl p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reviews</h1>
          <p className="mt-2 text-slate-400">Collect feedback for destinations, trip plans, or bookings.</p>
        </div>
      </div>

      <form onSubmit={handleCreateReview} className="mt-6 grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm text-slate-400">Type</span>
            <select value={targetTable} onChange={(e) => setTargetTable(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100">
              <option value="destinations">Destination</option>
              <option value="trip_plans">Trip plan</option>
              <option value="bookings">Booking</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Target ID</span>
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Enter target ID"
              className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Rating</span>
            <input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-slate-400">Comment</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Optional review text"
            className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="submit" className="rounded-full bg-cyan-400 px-5 py-3 text-slate-950">Submit review</button>
          <p className="text-sm text-slate-500">Tip: use item IDs from search or import pages so your review maps to real data.</p>
        </div>
      </form>

      {error && <div className="mt-4 rounded-3xl border border-rose-600 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
      {success && <div className="mt-4 rounded-3xl border border-emerald-600 bg-emerald-500/10 p-4 text-sm text-emerald-100">{success}</div>}

      {reviews.length === 0 && <p className="mt-4 text-slate-400">No reviews yet.</p>}
      <ul className="mt-4 space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">{r.target_table} • {r.target_id}</div>
                <div className="mt-1 font-semibold">Rating: {r.rating}</div>
                {r.comment && <div className="mt-2 text-slate-300">{r.comment}</div>}
              </div>
              <div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="rounded-full border border-rose-600 px-3 py-1 text-rose-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ReviewsPage;
