import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const currentErrors = { email: '', password: '', general: '' };

    if (!email.trim()) {
      currentErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      currentErrors.email = 'Enter a valid email address.';
    }

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      currentErrors.password = 'Password is required.';
    } else if (trimmedPassword.length < 6) {
      currentErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(currentErrors);
    return !currentErrors.email && !currentErrors.password;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setErrors({ email: '', password: '', general: '' });

    try {
      const auth = await login({ email: email.trim(), password: password.trim() });
      localStorage.setItem('travelmate_auth', JSON.stringify(auth));
      navigate('/dashboard');
    } catch (error) {
      setErrors((prev) => ({ ...prev, general: (error as Error).message || 'Sign-in failed.' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-10 shadow-soft">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Member access</p>
          <h1 className="text-4xl font-semibold text-white">Sign in to TravelMate AI</h1>
          <p className="text-slate-400">Access your trips, itineraries, group chat, and booking dashboard.</p>
        </div>

        {errors.general && (
          <div className="mb-6 rounded-3xl border border-rose-600 bg-rose-500/10 p-4 text-sm text-rose-200">
            {errors.general}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm text-slate-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            />
            {errors.email && <p className="mt-2 text-sm text-rose-300">{errors.email}</p>}
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="mt-3 w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            />
            {errors.password && <p className="mt-2 text-sm text-rose-300">{errors.password}</p>}
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-cyan-400 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-300">
          <p className="mb-3 font-semibold text-slate-100">Need an account?</p>
          <p>Register your travel team to unlock AI itinerary generation, booking management, and live group planning.</p>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
