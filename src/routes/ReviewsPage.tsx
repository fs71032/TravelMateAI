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