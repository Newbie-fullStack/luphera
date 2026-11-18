import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
} from '@/features/auth/api';
import type { Address } from '@/features/auth/types';
import { fetchCities } from '@/features/cart/api';
import { AccountAddressesPage } from '@/features/account/AccountAddressesPage';
import { renderWithAuth } from '@/test/auth';

vi.mock('@/features/auth/api', () => ({
  createAddress: vi.fn(),
  deleteAddress: vi.fn(),
  fetchAddresses: vi.fn(),
  updateAddress: vi.fn(),
}));

vi.mock('@/features/cart/api', () => ({
  fetchCities: vi.fn(),
}));

const mockedFetchAddresses = vi.mocked(fetchAddresses);
const mockedCreateAddress = vi.mocked(createAddress);
const mockedDeleteAddress = vi.mocked(deleteAddress);
const mockedUpdateAddress = vi.mocked(updateAddress);
const mockedFetchCities = vi.mocked(fetchCities);

const address: Address = {
  id: '01HZZZZZZZZZZZZZZZZZZZZZA',
  label: 'Maison',
  recipient_name: 'Salma Bennani',
  phone: '+212612345678',
  city: { slug: 'casablanca', name: 'Casablanca', delivery_days: '24 à 48 h' },
  district: 'Maarif',
  address: '12 rue des Orangers',
  landmark: null,
  is_default: true,
};

function renderPage() {
  return renderWithAuth(<AccountAddressesPage />, { withRouter: false });
}

describe('AccountAddressesPage', () => {
  beforeEach(() => {
    mockedFetchAddresses.mockReset();
    mockedCreateAddress.mockReset();
    mockedDeleteAddress.mockReset();
    mockedUpdateAddress.mockReset();
    mockedFetchCities.mockReset();

    mockedFetchAddresses.mockResolvedValue([address]);
    mockedFetchCities.mockResolvedValue([
      { slug: 'casablanca', name: 'Casablanca', fee_cents: 2500, delivery_days: '24 à 48 h' },
    ]);
    mockedCreateAddress.mockResolvedValue(address);
    mockedDeleteAddress.mockResolvedValue(null);
    mockedUpdateAddress.mockResolvedValue(address);
  });

  it('lists the saved address and marks the default one', async () => {
    renderPage();

    expect(await screen.findByText('Maison')).toBeInTheDocument();
    expect(screen.getByText('Par défaut')).toBeInTheDocument();
    expect(screen.getByText('06 12 34 56 78')).toBeInTheDocument();
    expect(screen.getByText('12 rue des Orangers, Maarif')).toBeInTheDocument();
  });

  it('creates an address with a normalized phone', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Ajouter une adresse' }));

    await user.type(screen.getByLabelText('Libellé'), 'Bureau');
    await user.type(screen.getByLabelText('Nom du destinataire'), 'Salma Bennani');
    await user.type(screen.getByLabelText('Téléphone'), '0612345678');
    await user.selectOptions(screen.getByLabelText('Ville'), 'casablanca');
    await user.type(screen.getByLabelText('Quartier'), 'Gauthier');
    await user.type(screen.getByLabelText('Adresse', { exact: true }), '4 rue Ibn Batouta');

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mockedCreateAddress).toHaveBeenCalledWith({
        label: 'Bureau',
        recipient_name: 'Salma Bennani',
        phone: '+212612345678',
        city: 'casablanca',
        district: 'Gauthier',
        address: '4 rue Ibn Batouta',
        landmark: null,
        is_default: false,
      }),
    );
  });

  it('asks for confirmation before deleting an address', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(mockedDeleteAddress).toHaveBeenCalledWith(address.id));
    confirm.mockRestore();
  });

  it('promotes another address to default', async () => {
    const user = userEvent.setup();

    mockedFetchAddresses.mockResolvedValue([{ ...address, is_default: false }]);

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Définir par défaut' }));

    await waitFor(() =>
      expect(mockedUpdateAddress).toHaveBeenCalledWith(address.id, { is_default: true }),
    );
  });
});
