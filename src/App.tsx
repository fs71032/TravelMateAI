import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { lazy, ReactNode, Suspense } from 'react';
import NotificationBell from './components/NotificationBell';
import BackendStatus from './components/BackendStatus';
import { useAuth } from './auth/AuthContext';
import { useNotificationsSync } from './hooks/useNotificationsSync';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { setMenuOpen } from './store/uiSlice';

const LandingPage = lazy(() => import('./routes/LandingPage'));
const DashboardPage = lazy(() => import('./routes/DashboardPage'));
const TripPlannerPage = lazy(() => import('./routes/TripPlannerPage'));
const ChatPage = lazy(() => import('./routes/ChatPage'));
const DestinationsPage = lazy(() => import('./routes/DestinationsPage'));
const LoginPage = lazy(() => import('./routes/LoginPage'));
const BookingsPage = lazy(() => import('./routes/BookingsPage'));
const ReviewsPage = lazy(() => import('./routes/ReviewsPage'));
const FavoritesPage = lazy(() => import('./routes/FavoritesPage'));
const SearchPage = lazy(() => import('./routes/SearchPage'));
const ImportPage = lazy(() => import('./routes/ImportPage'));
const ReportsPage = lazy(() => import('./routes/ReportsPage'));
const ProfilePage = lazy(() => import('./routes/ProfilePage'));
const UserManagementPage = lazy(() => import('./routes/UserManagementPage'));

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Trip Planner', path: '/planner' },
  { label: 'Bookings', path: '/bookings' },
  { label: 'Reports', path: '/reports' },
  { label: 'Chat', path: '/chat' }
];

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 px-6 py-4 text-sm">Loading page…</div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const { user, signOut } = useAuth();
  const dispatch = useAppDispatch();
  const menuOpen = useAppSelector((state) => state.ui.menuOpen);

  useNotificationsSync(user?.user?.email);

  const handleSignOut = () => {
    signOut();
    dispatch(setMenuOpen(false));
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <BackendStatus />
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-semibold tracking-tight text-cyan-300">
            TravelMate AI
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="rounded-full px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex relative">
            {user?.user?.email && <NotificationBell userEmail={user.user.email} />}
            {user?.user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => dispatch(setMenuOpen(!menuOpen))}
                  className="rounded-full border border-slate-800 bg-slate-900/80 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-400"
                >
                  {user.user.name}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(setMenuOpen(false));
                        navigate('/profile');
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-100 transition hover:bg-slate-900"
                    >
                      Profile
                    </button>
                    {user.user.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          dispatch(setMenuOpen(false));
                          navigate('/admin/users');
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-slate-100 transition hover:bg-slate-900"