import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { RegisterPage } from '@/pages/RegisterPage';
import { authValue, renderWithAuth, testUser } from '@/test/auth';

function renderRegister(value = authValue()) {
  return renderWithAuth(
    <Routes>
      <Route path="/inscription" element={<RegisterPage />} />
      <Route path="/compte" element={<p>espace client</p>} />
    </Routes>,
    { route: '/inscription', value },
  );
}

async function fillForm() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText('Nom complet'), 'Salma Bennani');
  await user.type(screen.getByLabelText('Téléphone'), '06 12 34 56 78');
  await user.type(screen.getByLabelText('E-mail'), 'salma@example.ma');
  await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'secret123');

  return user;
}

describe('RegisterPage', () => {
  it('asks for the missing name first', async () => {
    const user = userEvent.setup();
    const value = authValue();

    renderRegister(value);

    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByText('Indiquez votre nom complet.')).toBeInTheDocument();
    expect(value.register).not.toHaveBeenCalled();
  });

  it('creates the account with a normalized phone', async () => {
    const value = authValue({ register: vi.fn().mockResolvedValue(testUser) });

    renderRegister(value);

    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() =>
      expect(value.register).toHaveBeenCalledWith({
        name: 'Salma Bennani',
        phone: '+212612345678',
        email: 'salma@example.ma',
        password: 'secret123',
        password_confirmation: 'secret123',
        marketing_opt_in: false,
      }),
    );
    expect(await screen.findByText('espace client')).toBeInTheDocument();
  });

  it('refuses two different passwords', async () => {
    const user = userEvent.setup();
    const value = authValue();

    renderRegister(value);

    await user.type(screen.getByLabelText('Nom complet'), 'Salma Bennani');
    await user.type(screen.getByLabelText('Téléphone'), '0612345678');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'secret456');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
    expect(value.register).not.toHaveBeenCalled();
  });
});
