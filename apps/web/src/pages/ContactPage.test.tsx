import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendContactMessage } from '@/features/contact/api';
import { ContactPage } from '@/pages/ContactPage';
import { renderWithAuth } from '@/test/auth';

vi.mock('@/features/contact/api', () => ({
  sendContactMessage: vi.fn(),
}));

const mockedSend = vi.mocked(sendContactMessage);

describe('ContactPage', () => {
  beforeEach(() => {
    mockedSend.mockReset();
  });

  it('validates the required fields before calling the API', async () => {
    const user = userEvent.setup();

    renderWithAuth(<ContactPage />);

    await user.click(screen.getByRole('button', { name: 'Envoyer le message' }));

    expect(await screen.findByText('Entrez votre nom.')).toBeInTheDocument();
    expect(screen.getByText('Entrez une adresse e-mail valide.')).toBeInTheDocument();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('sends the message with a normalised phone and shows the confirmation', async () => {
    const user = userEvent.setup();
    mockedSend.mockResolvedValue({ received: true });

    renderWithAuth(<ContactPage />);

    await user.type(screen.getByLabelText('Nom'), 'Salma Bennani');
    await user.type(screen.getByLabelText('E-mail'), 'salma@example.ma');
    await user.type(screen.getByLabelText('Téléphone'), '06 12 34 56 78');
    await user.selectOptions(screen.getByLabelText('Sujet'), 'Une commande');
    await user.type(
      screen.getByLabelText('Message'),
      'Bonjour, ma commande est arrivée avec un flacon fêlé.',
    );
    await user.click(screen.getByRole('button', { name: 'Envoyer le message' }));

    await waitFor(() =>
      expect(mockedSend).toHaveBeenCalledWith({
        name: 'Salma Bennani',
        email: 'salma@example.ma',
        phone: '+212612345678',
        subject: 'Une commande',
        message: 'Bonjour, ma commande est arrivée avec un flacon fêlé.',
        website: '',
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Message reçu' })).toBeInTheDocument();
  });

  it('keeps the form usable when the API refuses the message', async () => {
    const user = userEvent.setup();
    mockedSend.mockRejectedValue(new Error('boom'));

    renderWithAuth(<ContactPage />);

    await user.type(screen.getByLabelText('Nom'), 'Salma Bennani');
    await user.type(screen.getByLabelText('E-mail'), 'salma@example.ma');
    await user.selectOptions(screen.getByLabelText('Sujet'), 'Autre demande');
    await user.type(
      screen.getByLabelText('Message'),
      'Bonjour, je souhaite poser une question sur ma commande.',
    );
    await user.click(screen.getByRole('button', { name: 'Envoyer le message' }));

    expect(
      await screen.findByText("L'envoi a échoué. Réessayez dans un instant."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer le message' })).toBeEnabled();
  });
});
