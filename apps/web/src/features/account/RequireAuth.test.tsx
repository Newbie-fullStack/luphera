import { screen } from '@testing-library/react';
import { Route, Routes, useSearchParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RequireAuth } from '@/features/account/RequireAuth';
import { authValue, renderWithAuth, testUser } from '@/test/auth';

function LoginStub() {
  const [params] = useSearchParams();

  return <p>connexion demandée pour {params.get('redirect')}</p>;
}

function renderGuard(value = authValue()) {
  return renderWithAuth(
    <Routes>
      <Route path="/connexion" element={<LoginStub />} />
      <Route
        path="/compte/commandes"
        element={
          <RequireAuth>
            <p>commandes privées</p>
          </RequireAuth>
        }
      />
    </Routes>,
    { route: '/compte/commandes', value },
  );
}

describe('RequireAuth', () => {
  it('sends a visitor to the login screen with the requested path', async () => {
    renderGuard();

    expect(
      await screen.findByText('connexion demandée pour /compte/commandes'),
    ).toBeInTheDocument();
  });

  it('renders the private content for a signed-in customer', () => {
    renderGuard(authValue({ user: testUser }));

    expect(screen.getByText('commandes privées')).toBeInTheDocument();
  });

  it('waits for the session instead of flashing the login screen', () => {
    renderGuard(authValue({ isLoading: true }));

    expect(screen.getByRole('status')).toHaveTextContent('Chargement');
    expect(screen.queryByText(/connexion demandée/)).not.toBeInTheDocument();
  });
});
