import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
} from '@/features/auth/api';
import type { Address, AddressPayload } from '@/features/auth/types';
import { fetchCities } from '@/features/cart/api';
import { AddressForm } from '@/features/account/components/AddressForm';
import { formatMoroccanPhone } from '@/lib/phone';

type Editing = Address | 'new' | null;

export function AccountAddressesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: fetchAddresses });
  const cities = useQuery({
    queryKey: ['shipping', 'cities'],
    queryFn: fetchCities,
    staleTime: 300_000,
  });
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    void queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  const save = useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: AddressPayload }) =>
      id === null ? createAddress(payload) : updateAddress(id, payload),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      refresh();
    },
    onError: () => setError(t('account.addresses.error')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: () => setError(t('account.addresses.deleteError')),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => updateAddress(id, { is_default: true }),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: () => setError(t('account.addresses.error')),
  });

  useEffect(() => {
    document.title = `${t('account.addresses.title')} — Luphéra`;
  }, [t]);

  const handleSave = (payload: AddressPayload) => {
    save.mutate({ id: editing === null || editing === 'new' ? null : editing.id, payload });
  };

  const handleDelete = (address: Address) => {
    if (window.confirm(t('account.addresses.confirmDelete'))) {
      remove.mutate(address.id);
    }
  };

  const list = addresses.data ?? [];
  const busy = save.isPending || remove.isPending || setDefault.isPending;

  return (
    <section className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] leading-tight">{t('account.addresses.title')}</h2>
          <p className="text-[14px] leading-relaxed text-brume">{t('account.addresses.lead')}</p>
        </div>
        {editing === null ? (
          <Button variant="secondary" onClick={() => setEditing('new')} className="min-h-10 px-4 text-[10.5px]">
            {t('account.addresses.add')}
          </Button>
        ) : null}
      </header>

      {error !== null ? (
        <p role="alert" className="border border-[#5a2b2b] bg-[#2a1414] p-4 text-[13px] text-[#e8b4b4]">
          {error}
        </p>
      ) : null}

      {editing !== null ? (
        <AddressForm
          address={editing === 'new' ? null : editing}
          cities={cities.data ?? []}
          submitting={save.isPending}
          onSubmit={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      {addresses.isLoading ? (
        <p role="status" className="py-6 text-[11px] uppercase tracking-[.3em] text-brume">
          {t('common.loading')}
        </p>
      ) : list.length === 0 ? (
        <p className="border border-ligne p-6 text-[15px] text-texte">{t('account.addresses.empty')}</p>
      ) : (
        <ul className="grid gap-4">
          {list.map((address) => (
            <li key={address.id} className="grid gap-4 border border-ligne p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[15px] text-ivoire">{address.label ?? address.recipient_name}</p>
                  {address.is_default ? (
                    <span className="tag">{t('account.addresses.defaultBadge')}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {!address.is_default ? (
                    <button
                      type="button"
                      onClick={() => setDefault.mutate(address.id)}
                      disabled={busy}
                      className="text-[10.5px] uppercase tracking-[.22em] text-brume hover:text-or-clair disabled:opacity-50"
                    >
                      {t('account.addresses.makeDefault')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setEditing(address)}
                    disabled={busy}
                    className="text-[10.5px] uppercase tracking-[.22em] text-or-clair hover:text-ivoire disabled:opacity-50"
                  >
                    {t('account.addresses.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(address)}
                    disabled={busy}
                    className="text-[10.5px] uppercase tracking-[.22em] text-brume hover:text-[#e8b4b4] disabled:opacity-50"
                  >
                    {t('account.addresses.delete')}
                  </button>
                </div>
              </div>

              <address className="not-italic text-[14px] leading-relaxed text-texte">
                <span className="block text-ivoire">{address.recipient_name}</span>
                <span className="block">{formatMoroccanPhone(address.phone)}</span>
                <span className="block">
                  {address.address}, {address.district}
                </span>
                <span className="block">{address.city?.name ?? ''}</span>
                {address.landmark !== null ? (
                  <span className="block text-brume">{address.landmark}</span>
                ) : null}
              </address>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
