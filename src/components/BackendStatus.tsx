import { useEffect } from 'react';
import { resolveApiUrl } from '../config/apiBase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setBackendOnline } from '../store/uiSlice';

export default function BackendStatus() {
  const dispatch = useAppDispatch();
  const online = useAppSelector((state) => state.ui.backendOnline);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const response = await fetch(resolveApiUrl('/api/health'), { cache: 'no-store' });
        if (active) dispatch(setBackendOnline(response.ok));
      } catch {
        if (active) dispatch(setBackendOnline(false));
      }
    };

    check();
    const interval = setInterval(check, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [dispatch]);

  if (online !== false) {
    return null;
  }

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-3 text-center text-sm text-amber-100">
      Backend nuk po punon. Nga folderi kryesor ekzekuto{' '}
      <code className="rounded bg-slate-900 px-1.5 py-0.5 text-cyan-200">npm start</code> ose dykliko{' '}
      <code className="rounded bg-slate-900 px-1.5 py-0.5 text-cyan-200">START.bat</code>. Faqja:{' '}
      <strong>http://localhost:5173</strong> (jo porti 4000).
    </div>
  );
}
