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