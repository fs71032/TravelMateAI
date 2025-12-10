import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login, register } from '../services/authService';
import { useAuth } from '../auth/AuthContext';

function LoginPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [errors, setErrors] = useState({ name: '', email: '', password: '', general: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn } = useAuth();
  const submittingRef = useRef(false);
  const redirectPath = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, redirectPath]);

  const validate = () => {
    const currentErrors = { name: '', email: '', password: '', general: '' };

    if (isRegisterMode && !name.trim()) {
      currentErrors.name = 'Name is required.';
    }

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
    return !currentErrors.name && !currentErrors.email && !currentErrors.password;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsLoading(true);
    setErrors({ name: '', email: '', password: '', general: '' });

    try {
      const auth = isRegisterMode
        ? await register({ name: name.trim(), email: email.trim(), password: password.trim() })
        : await login({ email: email.trim(), password: password.trim() });

      signIn(auth);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        general: (error as Error).message || (isRegisterMode ? 'Registration failed.' : 'Sign-in failed.')
      }));
    } finally {
      submittingRef.current = false;
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
