import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DesignSystemPage } from '@/pages/DesignSystemPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <DesignSystemPage />
    </MemoryRouter>,
  );
}

describe('DesignSystemPage', () => {
  it('renders the charter', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Charte Luphéra' })).toBeInTheDocument();
    expect(screen.getByText('Marcellus · Jost')).toBeInTheDocument();
  });

  it('lists every brand colour', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'Copier la couleur Or Luphéra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copier la couleur Nuit' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Copier la couleur/ })).toHaveLength(11);
  });

  it('toggles a chip', async () => {
    renderPage();

    const femme = screen.getByRole('button', { name: 'Femme' });
    expect(femme).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(femme);

    expect(femme).toHaveAttribute('aria-pressed', 'true');
  });

  it('increments the quantity stepper', async () => {
    renderPage();

    const increase = screen.getByRole('button', { name: 'Ajouter un' });
    await userEvent.click(increase);

    expect(screen.getByText('2', { selector: 'output' })).toBeInTheDocument();
  });

  it('shows the phone error state', () => {
    renderPage();

    expect(screen.getByText('Entrez un numéro marocain valide.')).toBeInTheDocument();
    expect(screen.getByLabelText('Téléphone')).toHaveAttribute('aria-invalid', 'true');
  });
});
