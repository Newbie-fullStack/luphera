import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import type { AuthUser } from '@/features/auth/types';
import { AuthContext, type AuthContextValue } from '@/features/auth/useAuth';

export const testUser: AuthUser = {
  id: '01HZZZZZZZZZZZZZZZZZZZZZZ',
  name: 'Salma Bennani',
  phone: '+212612345678',
  email: 'salma@example.ma',
  phone_verified: false,
  marketing_opt_in: false,
  roles: ['customer'],
  created_at: '2026-11-15T10:00:00+00:00',
};

export function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn(),
    ...overrides,
  };
}

export function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

interface RenderOptions {
  value?: AuthContextValue;
  route?: string;
  withRouter?: boolean;
}

export function renderWithAuth(ui: ReactElement, options: RenderOptions = {}) {
  const { value = authValue(), route = '/', withRouter = true } = options;
  const client = testQueryClient();

  const wrapper = (children: ReactNode) => {
    const withProviders = (
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    );

    return withRouter ? (
      <MemoryRouter initialEntries={[route]}>{withProviders}</MemoryRouter>
    ) : (
      withProviders
    );
  };

  return { client, value, ...render(wrapper(ui)) };
}
