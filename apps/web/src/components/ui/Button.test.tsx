import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders a primary button by default', () => {
    render(<Button>Ajouter au panier</Button>);

    const button = screen.getByRole('button', { name: 'Ajouter au panier' });

    expect(button).toHaveClass('btn', 'btn-primary');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('renders the secondary variant', () => {
    render(<Button variant="secondary">Découvrir</Button>);

    expect(screen.getByRole('button', { name: 'Découvrir' })).toHaveClass('btn-secondary');
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Indisponible
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Indisponible' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
