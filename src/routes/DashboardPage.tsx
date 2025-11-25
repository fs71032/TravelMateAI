import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
const AiRecommendation = lazy(() => import('../components/AiRecommendation'));
import StatsCard from '../components/StatsCard';
import { useAuth } from '../auth/AuthContext';
import { fetchSavedPlans, type TripPlan } from '../services/tripPlanStorage';
import { fetchBookings } from '../services/bookingService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectUnreadCount } from '../store/notificationsSlice';
import { toggleShowAiPanel } from '../store/uiSlice';

function DashboardPage() {
  const { user } = useAuth();
  const userEmail = user?.user.email;
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector(selectUnreadCount);
  const showAi = useAppSelector((state) => state.ui.showAiPanel);
  const [savedPlans, setSavedPlans] = useState<TripPlan[]>([]);
  const [bookingCount, setBookingCount] = useState(0);

  const refreshSavedPlans = () => {
    fetchSavedPlans(userEmail).then(setSavedPlans);
  };

  useEffect(() => {
    refreshSavedPlans();
  }, [userEmail]);

  useEffect(() => {
    fetchBookings()
      .then((data) => setBookingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setBookingCount(0));
  }, []);

  const stats = useMemo(() => {
    const tripCount = savedPlans.length;
    return [
      { label: 'Trips planned', value: String(tripCount) },
      { label: 'Upcoming bookings', value: String(bookingCount) },
      { label: 'Unread alerts', value: String(unreadCount) }
    ];
  }, [savedPlans, bookingCount, unreadCount]);

  const toolCards = [
    {
      title: 'Search',
      description: 'Find destinations, plans, bookings, messages, and users from one place.',
      link: '/search',
      accent: 'bg-cyan-200 text-slate-950'
    },
    {
      title: 'Favorites',
      description: 'Quickly access saved favorites across trips and destinations.',
      link: '/favorites',
      accent: 'bg-sky-200 text-slate-950'
    },
    {
      title: 'Reviews',
      description: 'Manage ratings and feedback in one place to improve service quality.',
      link: '/reviews',
      accent: 'bg-amber-200 text-slate-950'
    },
    {
      title: 'Import',
      description: 'Upload JSON or CSV files to add destinations, trips, bookings, or users.',
      link: '/import',
      accent: 'bg-violet-200 text-slate-950'
    }
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">TravelMate AI Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Overview of your travel operations</h1>
        </div>
        <div className="rounded-full border border-slate-800 bg-slate-900/70 px-5 py-3 text-sm text-slate-300">
          {user?.user?.name ? `Signed in as ${user.user.name}` : 'Sign in to see your personal travel data.'}
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
        <button
          type="button"
          onClick={() => dispatch(toggleShowAiPanel())}
          className="rounded-3xl border border-cyan-700/40 bg-cyan-400/10 p-6 text-left shadow-soft transition hover:border-cyan-400"
        >
          <h3 className="text-lg font-semibold text-white">AI Planner</h3>
          <p className="mt-2 text-sm text-slate-300">Generate AI itineraries and save them in one click.</p>
          <span className="mt-4 inline-block rounded-full bg-cyan-400 px-4 py-1.5 text-xs font-semibold text-slate-950">
            {showAi ? 'Close panel' : 'Open AI panel'}
          </span>
        </button>
      </div>

      {showAi && (
        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-soft">
          <div className="mb-2">
            <h2 className="text-xl font-semibold text-white">AI recommendations & itineraries</h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter a destination (other fields are optional) and click Generate — AI fills in the itinerary automatically.
            </p>
          </div>
          <Suspense fallback={<div className="text-sm text-slate-400">Loading AI…</div>}>
            <AiRecommendation onSaved={refreshSavedPlans} />
          </Suspense>
        </section>
      )}

      <section className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Quick access tools</h2>
            <p className="mt-2 text-slate-400">Use the dashboard cards to reach search, imports, reviews, and favorites without a crowded navigation bar.</p>
          </div>
          <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">Organized for faster work</span>
        </div>
        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {toolCards.map((tool) => (
            <Link
              key={tool.title}
              to={tool.link}
              className="group rounded-3xl border border-slate-800 bg-slate-950/70 p-5 transition hover:border-cyan-400"
            >
              <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${tool.accent}`}>
                {tool.title}
              </div>
              <p className="mt-4 text-slate-300">{tool.description}</p>
              <div className="mt-5 text-sm font-semibold text-cyan-300 transition group-hover:text-cyan-200">Open {tool.title}</div>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

export default DashboardPage;
