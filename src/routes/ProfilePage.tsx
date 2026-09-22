import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../services/authService';
import { useAuth } from '../auth/AuthContext';

function ProfilePage() {
  const { user, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.user.name || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ message: '', error: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [navigate, user]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ message: '', error: '' });

    try {
      const updated = await updateProfile({
        email: user.user.email,
        name: name.trim(),
        password: password.trim() || undefined
      });

      signIn({
        accessToken: updated.accessToken,
        refreshToken: updated.refreshToken || user.refreshToken,
        user: updated.user
      });
      setStatus({ message: 'Profile updated successfully.', error: '' });
      setPassword('');
    } catch (error) {
      setStatus({ message: '', error: (error as Error).message || 'Unable to update profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-10 shadow-soft">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Profile</p>
          <h1 className="text-4xl font-semibold text-white">Welcome back, {user.user.name}</h1>
          <p className="text-slate-400">Update your account details or sign out when you're finished.</p>
        </div>

        {status.message && (
          <div className="mb-6 rounded-3xl border border-emerald-600 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {status.message}
          </div>
        )}
        {status.error && (
          <div className="mb-6 rounded-3xl border border-rose-600 bg-rose-500/10 p-4 text-sm text-rose-200">
            {status.error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm text-slate-300">Email</span>
            <input
              type="email"
              value={user.user.email}
              readOnly
              className="mt-3 w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-400 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Full name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              className="mt-3 w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave empty to keep current password"
              className="mt-3 w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            />
          </label>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="submit"
              disabled={isLoading}
              className={`btn btn-primary ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={handleSignOut} className="btn btn-danger">
              Sign out
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default ProfilePage;
