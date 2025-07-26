import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { AuthResponse } from '../services/authService';
import { clearSavedPlansCache } from '../services/tripPlanStorage';
import { identifySocketUser } from '../services/socket';

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
    try {
      if (auth?.user) {
        identifySocketUser({
          email: auth.user.email,
          name: auth.user.name,
          accessToken: auth.accessToken
        });
      }
    } catch {
      // ignore
    }
  }, [auth]);

  const signIn = (authResponse: AuthResponse) => {
    setAuth(authResponse);
  };

  const signOut = () => {
    clearSavedPlansCache();
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
