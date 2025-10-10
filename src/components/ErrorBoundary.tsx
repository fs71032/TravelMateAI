import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] render error', error, info);
  }

  render() {
    if (this.state.error) {
      const clearSession = () => {
        try {
          localStorage.removeItem('travelmate_auth');
          localStorage.removeItem('travelmate_saved_plans');
          localStorage.removeItem('travelmate_itinerary_draft');
        } catch {
          // ignore
        }
        window.location.href = '/';
      };

      return (
        <div className="mx-auto max-w-lg p-8 text-center text-slate-100">
          <h1 className="text-xl font-semibold text-rose-300">Something went wrong</h1>
          <p className="mt-3 text-sm text-slate-400">
            This often happens when an old browser session is corrupted. Clear the session or start
            the app with <code className="text-cyan-300">npm start</code>.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950"
              onClick={clearSession}
            >
              Clear session
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-200"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
