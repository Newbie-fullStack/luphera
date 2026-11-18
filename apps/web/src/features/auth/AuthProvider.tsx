import { useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  updateProfile as updateProfileRequest,
} from './api';
import { AuthContext, type AuthContextValue } from './useAuth';

/**
 * The session lives in an httpOnly cookie; React only keeps the user payload
 * in the query cache. Every account page reads from this single query, so a
 * login refreshes the header and the guarded routes at once.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      queryClient.removeQueries({ queryKey: ['addresses'] });
      queryClient.removeQueries({ queryKey: ['wishlist'] });
      queryClient.removeQueries({ queryKey: ['account-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfileRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me.data ?? null,
      isLoading: me.isLoading,
      login: (payload) => loginMutation.mutateAsync(payload),
      register: (payload) => registerMutation.mutateAsync(payload),
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      updateProfile: (payload) => updateProfileMutation.mutateAsync(payload),
    }),
    [me.data, me.isLoading, loginMutation, registerMutation, logoutMutation, updateProfileMutation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
