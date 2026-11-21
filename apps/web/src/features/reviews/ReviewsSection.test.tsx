import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/useAuth';
import { fetchReviews, submitReview } from '@/features/reviews/api';
import { ReviewsSection } from '@/features/reviews/ReviewsSection';
import { ApiError } from '@/lib/api/client';
import { authValue, testQueryClient, testUser } from '@/test/auth';

vi.mock('@/features/reviews/api', () => ({
  fetchReviews: vi.fn(),
  submitReview: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchReviews);
const mockedSubmit = vi.mocked(submitReview);

function renderSection({ authenticated = false } = {}) {
  return render(
    <QueryClientProvider client={testQueryClient()}>
      <AuthContextWrapper authenticated={authenticated}>
        <MemoryRouter>
          <ReviewsSection productId="01HZZZZZZZZZZZZZZZZZZZZZZZ" slug="luphera-noir" />
        </MemoryRouter>
      </AuthContextWrapper>
    </QueryClientProvider>,
  );
}

function AuthContextWrapper({
  authenticated,
  children,
}: {
  authenticated: boolean;
  children: ReactNode;
}) {
  return (
    <AuthContext.Provider value={authValue({ user: authenticated ? testUser : null })}>
      {children}
    </AuthContext.Provider>
  );
}

describe('ReviewsSection', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedSubmit.mockReset();
    mockedFetch.mockResolvedValue({
      reviews: [
        {
          id: 1,
          rating: 5,
          title: 'Sillage tenace',
          body: 'Un parfum qui tient toute la journée.',
          author: 'Salma B.',
          created_at: '2026-11-18T10:00:00+00:00',
        },
      ],
      average: 5,
      count: 1,
      distribution: { '5': 1, '4': 0, '3': 0, '2': 0, '1': 0 },
    });
  });

  it('shows the average, the distribution and the approved reviews', async () => {
    renderSection();

    expect(await screen.findByText('Sillage tenace')).toBeInTheDocument();
    expect(screen.getByText('Un parfum qui tient toute la journée.')).toBeInTheDocument();
    expect(screen.getByText('Salma B.')).toBeInTheDocument();
    expect(screen.getByText('5.0')).toBeInTheDocument();
    expect(screen.getByText('Achat vérifié')).toBeInTheDocument();
  });

  it('invites a visitor to log in instead of showing the form', async () => {
    renderSection();

    expect(await screen.findByText('Connectez-vous pour donner votre avis.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/connexion?redirect=%2Fproduit%2Fluphera-noir',
    );
  });

  it('submits a review for a logged-in customer and confirms moderation', async () => {
    const user = userEvent.setup();
    mockedSubmit.mockResolvedValue({
      id: 2,
      rating: 4,
      title: null,
      body: 'Très beau parfum, livraison rapide.',
      author: 'Salma B.',
      created_at: '2026-11-19T10:00:00+00:00',
      status: 'pending',
    });

    renderSection({ authenticated: true });

    await screen.findByRole('heading', { name: 'Donner votre avis' });
    await user.click(screen.getByRole('radio', { name: '4 étoiles sur 5' }));
    await user.type(screen.getByLabelText('Votre avis'), 'Très beau parfum, livraison rapide.');
    await user.click(screen.getByRole('button', { name: 'Publier mon avis' }));

    await waitFor(() =>
      expect(mockedSubmit).toHaveBeenCalledWith({
        product_id: '01HZZZZZZZZZZZZZZZZZZZZZZZ',
        rating: 4,
        title: null,
        body: 'Très beau parfum, livraison rapide.',
      }),
    );
    expect(
      await screen.findByText('Votre avis a été envoyé et sera publié après relecture.'),
    ).toBeInTheDocument();
  });

  it('explains why a review cannot be written yet', async () => {
    const user = userEvent.setup();
    mockedSubmit.mockRejectedValue(
      new ApiError(403, {
        code: 'review_not_eligible',
        message: 'Un avis ne peut être déposé qu’après la livraison du produit.',
      }),
    );

    renderSection({ authenticated: true });

    await screen.findByRole('heading', { name: 'Donner votre avis' });
    await user.click(screen.getByRole('radio', { name: '5 étoiles sur 5' }));
    await user.type(screen.getByLabelText('Votre avis'), 'Un parfum absolument remarquable.');
    await user.click(screen.getByRole('button', { name: 'Publier mon avis' }));

    expect(
      await screen.findByText('Vous pourrez donner votre avis après la livraison de ce parfum.'),
    ).toBeInTheDocument();
  });
});
