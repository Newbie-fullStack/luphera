import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Mail, Search } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/features/auth/useAuth';
import {
  fetchMessage,
  fetchMessages,
  updateMessageStatus,
  type MessageFilters,
} from '@/lib/api/admin';
import type { ContactMessageStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

const STATUSES: ContactMessageStatus[] = ['new', 'read', 'replied', 'archived'];

export function MessagesPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const status = params.get('status') as ContactMessageStatus | null;
  const page = Number(params.get('page') ?? '1');

  const messages = useQuery({
    queryKey: ['messages', q, status, page],
    queryFn: () =>
      fetchMessages({
        q,
        status: status ?? undefined,
        page,
      } satisfies MessageFilters),
  });

  const message = useQuery({
    queryKey: ['message', selectedId],
    queryFn: () => fetchMessage(selectedId as number),
    enabled: selectedId !== null,
  });

  const update = useMutation({
    mutationFn: (next: ContactMessageStatus) => updateMessageStatus(selectedId as number, next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
      void queryClient.invalidateQueries({ queryKey: ['message', selectedId] });
      setFeedback(t('messages.updated'));
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const updateParams = (patch: Record<string, string>): void => {
    const next = new URLSearchParams(params);

    for (const [key, value] of Object.entries(patch)) {
      if (value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    if (!('page' in patch)) {
      next.delete('page');
    }

    setParams(next, { replace: true });
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={t('nav.groupRelation')}
        title={t('messages.title')}
        subtitle={t('messages.subtitle')}
        actions={
          messages.data !== undefined && messages.data.newCount > 0 ? (
            <span className="badge badge-pending">
              {t('messages.newCount', { count: messages.data.newCount })}
            </span>
          ) : undefined
        }
      />

      {feedback !== null ? (
        <p className="text-xs text-brume" role="status">
          {feedback}
        </p>
      ) : null}

      <form
        className="panel flex flex-wrap items-end gap-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ q });
        }}
      >
        <div className="min-w-[200px] flex-1">
          <label className="field-label" htmlFor="message-q">
            {t('common.search')}
          </label>
          <input
            id="message-q"
            className="field-input"
            placeholder={t('messages.searchPlaceholder')}
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="message-status">
            {t('common.status')}
          </label>
          <select
            id="message-status"
            className="field-select"
            value={status ?? ''}
            onChange={(event) => {
              updateParams({ status: event.target.value });
            }}
          >
            <option value="">{t('common.all')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`messages.status.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          <Search size={14} aria-hidden="true" />
          {t('common.filter')}
        </button>
      </form>

      <div className="panel">
        {messages.isLoading ? (
          <Spinner />
        ) : messages.isError || messages.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : messages.data.data.length === 0 ? (
          <EmptyState title={t('messages.empty')} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('common.date')}</th>
                    <th>{t('common.name')}</th>
                    <th>{t('messages.subject')}</th>
                    <th>{t('common.status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {messages.data.data.map((entry) => (
                    <tr key={entry.id} className={entry.status === 'new' ? 'text-ivoire' : undefined}>
                      <td className="whitespace-nowrap text-brume">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td>
                        <p className="text-ivoire">{entry.name}</p>
                        <p className="text-xs text-brume">{entry.email}</p>
                      </td>
                      <td className="max-w-[320px]">
                        <p className="text-ivoire">{entry.subject}</p>
                        <p className="truncate text-xs text-brume">{entry.excerpt}</p>
                      </td>
                      <td>
                        <StatusBadge value={entry.status} kind="message" />
                      </td>
                      <td className="actions">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setSelectedId(entry.id);
                              setFeedback(null);
                            }}
                          >
                            <Mail size={13} aria-hidden="true" />
                            {t('messages.open')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={messages.data.meta} onChange={(next) => updateParams({ page: String(next) })} />
          </>
        )}
      </div>

      {selectedId !== null ? (
        message.isLoading ? (
          <Spinner />
        ) : message.data !== undefined ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">{message.data.subject}</h2>
                <p className="mt-1 text-xs text-brume">
                  {message.data.name} · {message.data.email}
                  {message.data.phone !== null ? ` · ${message.data.phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="text-[10px] tracking-[0.16em] text-brume uppercase hover:text-ivoire"
                onClick={() => {
                  setSelectedId(null);
                }}
              >
                {t('common.close')}
              </button>
            </div>
            <div className="panel-body grid gap-5">
              <p className="whitespace-pre-line text-sm leading-relaxed text-texte">
                {message.data.body}
              </p>

              <dl className="grid gap-2 text-xs text-brume sm:grid-cols-2">
                <div>
                  <dt className="field-label">{t('common.date')}</dt>
                  <dd>{formatDateTime(message.data.created_at)}</dd>
                </div>
                <div>
                  <dt className="field-label">{t('messages.statusLabel')}</dt>
                  <dd>
                    <StatusBadge value={message.data.status} kind="message" />
                  </dd>
                </div>
                {message.data.customer !== null ? (
                  <div>
                    <dt className="field-label">{t('messages.customer')}</dt>
                    <dd>
                      {message.data.customer.name} · {message.data.customer.phone}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {can('messages.manage') ? (
                <div className="flex flex-wrap gap-2 border-t border-ligne pt-4">
                  {STATUSES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={update.isPending || message.data.status === value}
                      onClick={() => {
                        update.mutate(value);
                      }}
                    >
                      {t(`messages.mark.${value}`)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <p className="panel p-6 text-err">{t('common.error')}</p>
        )
      ) : null}
    </div>
  );
}
