import { createContext, useContext } from 'react';

import type { Staff } from '@/lib/api/types';

export interface AuthContextValue {
  user: Staff | null;
  isLoading: boolean;
  can: (permission: string) => boolean;
  login: (payload: { identifier: string; password: string }) => Promise<Staff>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

/**
 * Permission check for UI only. The API enforces the same right again, so a
 * hidden button is never the security boundary.
 */
export function hasPermission(user: Staff | null, permission: string): boolean {
  return user !== null && user.permissions.includes(permission);
}
