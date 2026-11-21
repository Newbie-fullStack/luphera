import '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '@/features/auth/useAuth';
import { fetchReviews, moderateReview } from '@/lib/api/admin';
import type { ReviewRow } from '@/lib/api/types';
import { ReviewsPage } from '@/pages/ReviewsPage';

vi.mock('@/lib/api/admin', () => ({
  fetchReviews: vi.fn(),
  moderateReview: vi.fn(),
}));

const mockedList = vi.mocked(fetchReviews);
const mockedModerate = vi.mocked(moderateReview);

const review: ReviewRow = {
  id: 7,
  rating: 4,
  title: 'À modérer',
  body: 'Un parfum agréable, livré rapidement.',
  author: 'Youssef E.',
  status: 'pending',
  product: { slug: 'luphera-ambre', name: 'Luphéra Ambre' },
  moderator: null,
  moderation_note: null,
  moderated_at: null,
  created_at: '2026-11-19T10:00:00+00:00',
};

const auth: AuthContextValue = {
  user: {
    id: '01HZZZZZZZZZZZZZZZZZZZZZZY',
    name: 'Support Luphéra',
    phone: '+212600000003',
    email: 'support@luphera.test',
    roles: ['support'],
    permissions: ['reviews.moderate'],
    last_login_at: null,
  },
  isLoading: false,
  can: (permission) => permission === 'reviews.moderate',
  login: vi.fn(),
  logout: vi.fn(),
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <ReviewsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ReviewsPage', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedModerate.mockReset();
    mockedList.mockResolvedValue({
      data: [review],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      pendingCount: 1,
    });
    mockedModerate.mockResolvedValue({
      ...review,
      status: 'approved',
      moderator: 'Support Luphéra',
      moderated_at: '2026-11-19T11:00:00+00:00',
    });
  });

  it('lists the moderation queue with the pending counter', async () => {
    renderPage();

    expect(await screen.findByText('Luphéra Ambre')).toBeInTheDocument();
    expect(screen.getByText('1 en attente')).toBeInTheDocument();
    expect(screen.getAllByText('En attente').length).toBeGreaterThan(1);
  });

  it('publishes a review from the moderation panel', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Modérer' }));

    expect(
      (await screen.findAllByText('Un parfum agréable, livré rapidement.')).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Publier' }));

    await waitFor(() =>
      expect(mockedModerate).toHaveBeenCalledWith(7, { status: 'approved', moderation_note: null }),
    );
    expect(await screen.findByText('Avis mis à jour.')).toBeInTheDocument();
  });
});
