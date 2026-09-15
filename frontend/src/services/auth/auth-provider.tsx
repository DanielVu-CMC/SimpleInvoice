import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '../api/client';
import type { User } from '../api/types';
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  unavailable: boolean;
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const retry = useCallback(() => {
    setLoading(true);
    setUnavailable(false);
    void api<User>('/auth/me')
      .then(setUser)
      .catch((error: unknown) => {
        if (!(error instanceof ApiError && error.status === 401))
          setUnavailable(true);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    retry();
  }, [retry]);
  useEffect(() => {
    const expire = () => {
      setUser(null);
      queryClient.clear();
      toast.info('Your session has expired. Please sign in again.');
    };
    window.addEventListener('session-expired', expire);
    return () => window.removeEventListener('session-expired', expire);
  }, [queryClient]);
  useEffect(() => {
    if (!user?.tokenExpiresAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = user.tokenExpiresAt! - Date.now();
      if (remaining <= 0) window.dispatchEvent(new Event('session-expired'));
      else timer = setTimeout(check, Math.min(remaining, 2147483647));
    };
    check();
    return () => clearTimeout(timer);
  }, [user]);
  const login = async (email: string, password: string) => {
    const result = await api<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    queryClient.clear();
    setUser(result.user);
    setUnavailable(false);
  };
  const logout = async () => {
    await api<void>('/auth/logout', { method: 'POST' });
    setUser(null);
    queryClient.clear();
  };
  return (
    <AuthContext.Provider
      value={{ user, loading, unavailable, retry, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
