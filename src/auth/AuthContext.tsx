import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { AuthResponse } from '../services/authService';
import { AUTH_UPDATED_EVENT, ensureFreshAccessToken } from '../services/api';
import { clearSavedPlansCache } from '../services/tripPlanStorage';
import { identifySocketUser, resetNotificationSocket } from '../services/socket';

interface AuthContextValue {
  user: AuthResponse | null;
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
  updateUser: (user: AuthResponse['user']) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const storageKey = 'travelmate_auth';

function isValidAuth(value: unknown): value is AuthResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const auth = value as AuthResponse;
  return (
    typeof auth.accessToken === 'string' &&
    auth.accessToken.length > 0 &&
    auth.user != null &&
    typeof auth.user.email === 'string' &&
    typeof auth.user.name === 'string'
  );
}

function readStoredAuth(): AuthResponse | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (isValidAuth(parsed)) {
      return parsed;
    }

    localStorage.removeItem(storageKey);
    return null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthResponse | null>(() => readStoredAuth());

  useEffect(() => {
    if (auth) {
      localStorage.setItem(storageKey, JSON.stringify(auth));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [auth]);

  useEffect(() => {
    const syncFromStorage = () => {
      const stored = readStoredAuth();
      if (stored) {
        setAuth(stored);
      }
    };

    window.addEventListener(AUTH_UPDATED_EVENT, syncFromStorage);
    return () => window.removeEventListener(AUTH_UPDATED_EVENT, syncFromStorage);
  }, []);

  useEffect(() => {
    let active = true;

    const identify = async () => {
      if (!auth?.user) return;
      try {
        const accessToken = await ensureFreshAccessToken();
        if (!active || !accessToken) return;
        identifySocketUser({
          email: auth.user.email,
          name: auth.user.name,
          accessToken
        });
      } catch {
        // ignore
      }
    };

    void identify();
    return () => {
      active = false;
    };
  }, [auth?.user?.email, auth?.user?.name, auth?.accessToken]);

  const signIn = (authResponse: AuthResponse) => {
    setAuth(authResponse);
  };

  const signOut = () => {
    clearSavedPlansCache();
    resetNotificationSocket();
    setAuth(null);
  };

  const updateUser = (user: AuthResponse['user']) => {
    setAuth((current) => (current ? { ...current, user } : current));
  };

  return <AuthContext.Provider value={{ user: auth, signIn, signOut, updateUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
