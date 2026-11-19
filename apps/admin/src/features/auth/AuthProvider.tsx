import { useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchStaff, staffLogin, staffLogout } from '@/lib/api/admin';
import type { Staff } from '@/lib/api/types';

import { AuthContext, hasPermission, type AuthContextValue } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ['staff'],
    queryFn: fetchStaff,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: staffLogin,
    onSuccess: (user) => {
      queryClient.setQueryData(['staff'], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: staffLogout,
    onSuccess: () => {
      queryClient.setQueryData(['staff'], null);
      queryClient.clear();
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me.data ?? null,
      isLoading: me.isLoading,
      can: (permission) => hasPermission(me.data ?? null, permission),
      login: (payload) => loginMutation.mutateAsync(payload),
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
    }),
    [me.data, me.isLoading, loginMutation, logoutMutation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export type { Staff };
