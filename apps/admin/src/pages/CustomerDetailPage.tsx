import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/features/auth/useAuth';
import {
  addCustomerNote,
  fetchCustomer,
  setCustomerActive,
} from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import { formatDate, formatDateTime, formatMAD, formatPhone, whatsappHref } from '@/lib/format';

export function CustomerDetailPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchCustomer(id),
    enabled: id !== '',
  });

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => setCustomerActive(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer', id] });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const addNote = useMutation({
    mutationFn: () => addCustomerNote(id, note),
    onSuccess: () => {
      setNote('');
      setFeedback(t('customers.noteAdded'));
      void queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  if (customer.isLoading) {
    return <Spinner />;
  }

  if (customer.isError || customer.data === undefined) {
    return <EmptyState title={t('common.empty')} />;
  }

  const data = customer.data;
  const wa = whatsappHref(data.phone);

  return (
    <div className="grid gap-5">
      <Link to="/clients" className="flex items-center gap-2 text-xs text-brume hover:text-ivoire">
        <ArrowLeft size={14} aria-hidden="true" />
        {t('common.back')}
      </Link>

      <PageHeader
        eyebrow={t('customers.title')}
        title={data.name}
        subtitle={`${t('customers.since')} ${formatDate(data.created_at)}`}
        actions={
          <>
            <StatusBadge value={data.segment} kind="segment" />
            {can('customers.manage') ? (
              <button
                type="button"
                className={data.is_active ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm'}
                disabled={toggleActive.isPending}
                onClick={() => {
                  toggleActive.mutate(!data.is_active);
                }}
              >
                {data.is_active ? t('customers.deactivate') : t('customers.activate')}
              </button>
            ) : null}
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <p className="kpi-label">{t('customers.orders')}</p>
          <p className="kpi-value mt-1">{data.orders_count}</p>
        </div>
        <div className="panel p-4">
          <p className="kpi-label">{t('customers.spent')}</p>
          <p className="kpi-value mt-1">{formatMAD(data.spent_cents)}</p>
        </div>
        <div className="panel p-4">
          <p className="kpi-label">{t('customers.lastOrder')}</p>
          <p className="mt-2 text-sm text-ivoire">
            {formatDate(data.orders[0]?.placed_at)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="kpi-label">{t('customers.marketing')}</p>
          <p className="mt-2 text-sm text-ivoire">
            {data.marketing_opt_in ? t('common.yes') : t('common.no')}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('customers.orders')}</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('orders.number')}</th>
                  <th>{t('common.date')}</th>
                  <th className="num">{t('orders.items')}</th>
                  <th className="num">{t('common.total')}</th>
                  <th>{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-brume">
                      {t('common.none')}
                    </td>
                  </tr>
                ) : (
                  data.orders.map((order) => (
                    <tr key={order.number}>
                      <td>
                        <Link
                          to={`/commandes/${order.number}`}
                          className="text-or-clair hover:underline"
                        >
                          {order.number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-brume">
                        {formatDateTime(order.placed_at)}
                      </td>
                      <td className="num">{order.items_count}</td>
                      <td className="num">{formatMAD(order.total_cents)}</td>
                      <td>
                        <StatusBadge value={order.status} kind="order" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">{t('common.phone')}</h2>
            </div>
            <div className="panel-body grid gap-2">
              <p className="text-ivoire">{formatPhone(data.phone)}</p>
              <p className="text-sm text-brume">{data.email ?? '—'}</p>
              <p className="text-xs text-brume">
                {t('customers.marketing')} ·{' '}
                {data.last_login_at === null
                  ? '—'
                  : formatDateTime(data.last_login_at)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`tel:${data.phone}`} className="btn btn-ghost btn-sm">
                  <Phone size={13} aria-hidden="true" />
                  {t('orders.call')}
                </a>
                {wa !== null ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    <MessageCircle size={13} aria-hidden="true" />
                    {t('orders.whatsapp')}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">{t('customers.addresses')}</h2>
            </div>
            <div className="panel-body grid gap-3">
              {data.addresses.length === 0 ? (
                <p className="text-sm text-brume">{t('common.none')}</p>
              ) : (
                data.addresses.map((address) => (
                  <div key={address.id} className="border-l border-ligne-forte pl-3 text-sm">
                    <p className="text-ivoire">
                      {address.label ?? address.city ?? '—'}
                      {address.is_default ? ` · ${t('products.default')}` : ''}
                    </p>
                    <p className="text-brume">{address.line1}</p>
                    <p className="text-xs text-brume">
                      {[address.district, address.city].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{t('customers.notes')}</h2>
        </div>
        <div className="panel-body grid gap-4">
          {data.notes.length === 0 ? (
            <p className="text-sm text-brume">{t('customers.noNotes')}</p>
          ) : (
            <ul className="grid gap-3">
              {data.notes.map((entry) => (
                <li key={entry.id} className="border-l border-ligne-forte pl-3">
                  <p className="text-sm leading-relaxed text-texte">{entry.body}</p>
                  <p className="mt-1 text-xs text-brume">
                    {entry.author ?? '—'} · {formatDateTime(entry.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {can('customers.manage') ? (
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();

                if (note.trim() !== '') {
                  addNote.mutate();
                }
              }}
            >
              <label className="field-label" htmlFor="customer-note">
                {t('customers.addNote')}
              </label>
              <textarea
                id="customer-note"
                className="field-textarea"
                rows={3}
                placeholder={t('customers.notePlaceholder')}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                }}
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm justify-self-start"
                  disabled={addNote.isPending || note.trim() === ''}
                >
                  {t('customers.addNote')}
                </button>
                {feedback !== null ? (
                  <p className="text-xs text-brume" role="status">
                    {feedback}
                  </p>
                ) : null}
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
