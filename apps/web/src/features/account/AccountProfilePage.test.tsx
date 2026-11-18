import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AccountProfilePage } from '@/features/account/AccountProfilePage';
import { authValue, renderWithAuth, testUser } from '@/test/auth';

describe('AccountProfilePage', () => {
  it('shows the phone as read-only with the SMS notice', () => {
    renderWithAuth(<AccountProfilePage />, { value: authValue({ user: testUser }) });

    expect(screen.getByText('06 12 34 56 78')).toBeInTheDocument();
    expect(screen.getByText(/vérification par SMS/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Téléphone')).not.toBeInTheDocument();
  });

  it('saves the editable fields', async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ...testUser, name: 'Salma B.' });

    renderWithAuth(<AccountProfilePage />, {
      value: authValue({ user: testUser, updateProfile }),
    });

    const name = screen.getByLabelText('Nom complet');
    await user.clear(name);
    await user.type(name, 'Salma B.');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        name: 'Salma B.',
        email: 'salma@example.ma',
        marketing_opt_in: false,
      }),
    );
    expect(await screen.findByText('Profil mis à jour.')).toBeInTheDocument();
  });
});
