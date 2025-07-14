import { Link, Route, Routes, useLocation } from 'react-router-dom';
import DashboardPage from './routes/DashboardPage';
import LandingPage from './routes/LandingPage';
import TripPlannerPage from './routes/TripPlannerPage';
import ChatPage from './routes/ChatPage';
import DestinationsPage from './routes/DestinationsPage';
import ReportsPage from './routes/ReportsPage';
import LoginPage from './routes/LoginPage';
import BookingsPage from './routes/BookingsPage';
import ExpensesPage from './routes/ExpensesPage';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Trip Planner', path: '/planner' },
  { label: 'Bookings', path: '/bookings' },
  { label: 'Expenses', path: '/expenses' },
  { label: 'Chat', path: '/chat' },
  { label: 'Reports', path: '/reports' }
];

function App() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
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
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/planner" element={<TripPlannerPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>

      {!isLanding && (
        <footer className="border-t border-slate-800 bg-slate-950 px-6 py-6 text-sm text-slate-500">
          <div className="mx-auto max-w-7xl">TravelMate AI · Intelligent travel planning designed for enterprise-ready experiences.</div>
        </footer>
      )}
    </div>
  );
}

export default App;
