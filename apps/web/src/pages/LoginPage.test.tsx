import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { LoginPage } from '@/pages/LoginPage';
import { authValue, renderWithAuth, testUser } from '@/test/auth';

function renderLogin(route = '/connexion', value = authValue()) {
  return renderWithAuth(
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/compte" element={<p>espace client</p>} />
      <Route path="/compte/commandes" element={<p>mes commandes</p>} />
    </Routes>,
    { route, value },
  );
}

describe('LoginPage', () => {
  it('refuses an empty form without calling the API', async () => {
    const user = userEvent.setup();
    const value = authValue();

    renderLogin('/connexion', value);

    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Indiquez votre téléphone ou votre e-mail.')).toBeInTheDocument();
    expect(value.login).not.toHaveBeenCalled();
  });

  it('signs in and opens the account area', async () => {
    const user = userEvent.setup();
    const value = authValue({ login: vi.fn().mockResolvedValue(testUser) });

    renderLogin('/connexion', value);

    await user.type(screen.getByLabelText('Téléphone ou e-mail'), '0612345678');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() =>
      expect(value.login).toHaveBeenCalledWith({ identifier: '0612345678', password: 'secret123' }),
    );
    expect(await screen.findByText('espace client')).toBeInTheDocument();
  });

  it('keeps the requested page in the redirect parameter', async () => {
    const user = userEvent.setup();
    const value = authValue({ login: vi.fn().mockResolvedValue(testUser) });

    renderLogin('/connexion?redirect=%2Fcompte%2Fcommandes', value);

    await user.type(screen.getByLabelText('Téléphone ou e-mail'), 'salma@example.ma');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('mes commandes')).toBeInTheDocument();
  });

  it('shows the server message under the identifier field', async () => {
    const user = userEvent.setup();
    const value = authValue({
      login: vi.fn().mockRejectedValue(
        new ApiError(422, {
          code: 'invalid_credentials',
          message: 'Identifiants incorrects.',
          fields: { identifier: ['Le téléphone, l’e-mail ou le mot de passe ne correspond pas.'] },
        }),
      ),
    });

    renderLogin('/connexion', value);

    await user.type(screen.getByLabelText('Téléphone ou e-mail'), '0612345678');
    await user.type(screen.getByLabelText('Mot de passe'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(
      await screen.findByText('Le téléphone, l’e-mail ou le mot de passe ne correspond pas.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Corrigez les champs signalés.')).toBeInTheDocument();
  });
});
