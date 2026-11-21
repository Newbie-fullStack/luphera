import type { ReactNode } from 'react';
import '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '@/features/auth/useAuth';
import { fetchMessage, fetchMessages, updateMessageStatus } from '@/lib/api/admin';
import type { ContactMessageDetail, ContactMessageSummary } from '@/lib/api/types';
import { MessagesPage } from '@/pages/MessagesPage';

vi.mock('@/lib/api/admin', () => ({
  fetchMessages: vi.fn(),
  fetchMessage: vi.fn(),
  updateMessageStatus: vi.fn(),
}));

const mockedList = vi.mocked(fetchMessages);
const mockedShow = vi.mocked(fetchMessage);
const mockedUpdate = vi.mocked(updateMessageStatus);

const summary: ContactMessageSummary = {
  id: 1,
  name: 'Youssef El Amrani',
  email: 'youssef@example.test',
  phone: '+212600000011',
  subject: 'Question sur la livraison',
  status: 'new',
  excerpt: 'Quel est le délai de livraison à Fès ?',
  ip: '127.0.0.1',
  created_at: '2026-11-19T10:00:00+00:00',
  read_at: null,
  replied_at: null,
};

const detail: ContactMessageDetail = {
  ...summary,
  body: 'Quel est le délai de livraison à Fès ?',
  user_agent: 'vitest',
  customer: { id: '01HZZZZZZZZZZZZZZZZZZZZZZZ', name: 'Youssef El Amrani', phone: '+212600000011' },
};

const auth: AuthContextValue = {
  user: {
    id: '01HZZZZZZZZZZZZZZZZZZZZZZY',
    name: 'Support Luphéra',
    phone: '+212600000003',
    email: 'support@luphera.test',
    roles: ['support'],
    permissions: ['messages.view', 'messages.manage'],
    last_login_at: null,
  },
  isLoading: false,
  can: (permission) => ['messages.view', 'messages.manage'].includes(permission),
  login: vi.fn(),
  logout: vi.fn(),
};

function renderPage(children: ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext.Provider value={auth}>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('MessagesPage', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedShow.mockReset();
    mockedUpdate.mockReset();
    mockedList.mockResolvedValue({
      data: [summary],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      newCount: 1,
    });
    mockedShow.mockResolvedValue(detail);
    mockedUpdate.mockResolvedValue({ ...summary, status: 'read', read_at: '2026-11-19T11:00:00+00:00' });
  });

  it('lists the inbox and shows the unread counter', async () => {
    renderPage(<MessagesPage />);

    expect(await screen.findByText('Question sur la livraison')).toBeInTheDocument();
    expect(screen.getByText('1 nouveau(x)')).toBeInTheDocument();
    expect(screen.getAllByText('Nouveau').length).toBeGreaterThan(1);
  });

  it('opens a message and moves it to read', async () => {
    const user = userEvent.setup();

    renderPage(<MessagesPage />);

    await user.click(await screen.findByRole('button', { name: /Ouvrir/ }));

    expect(await screen.findByText('Youssef El Amrani · youssef@example.test · +212600000011')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Marquer lu' }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith(1, 'read'));
    expect(await screen.findByText('Statut du message mis à jour.')).toBeInTheDocument();
  });
});
