import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Drawer } from '@/components/ui/Drawer';

describe('Drawer', () => {
  it('exposes a modal dialog with a title', () => {
    render(
      <Drawer open onClose={() => undefined} title="Votre panier" closeLabel="Fermer">
        Contenu
      </Drawer>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Votre panier' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Contenu')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Votre panier" closeLabel="Fermer">
        Contenu
      </Drawer>,
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    render(
      <Drawer open={false} onClose={() => undefined} title="Panier" closeLabel="Fermer">
        Contenu
      </Drawer>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
