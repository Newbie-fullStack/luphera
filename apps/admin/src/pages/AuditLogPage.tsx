import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { fetchAuditActions, fetchAuditLogs } from '@/lib/api/admin';
import { formatDateTime } from '@/lib/format';

export function AuditLogPage() {
  const { t } = useTranslation();
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const actions = useQuery({ queryKey: ['audit-actions'], queryFn: fetchAuditActions });

  const logs = useQuery({
    queryKey: ['audit', action, q, from, to, page],
    queryFn: () => fetchAuditLogs({ action, q, from, to, page }),
  });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={t('nav.groupSystem')}
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
      />

      <form
        className="panel grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
        }}
      >
        <div className="xl:col-span-2">
          <label className="field-label" htmlFor="audit-q">
            {t('common.search')}
          </label>
          <input
            id="audit-q"
            className="field-input"
            placeholder={t('audit.searchPlaceholder')}
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="audit-action">
            {t('audit.action')}
          </label>
          <select
            id="audit-action"
            className="field-select"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('audit.allActions')}</option>
            {(actions.data ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="audit-from">
            {t('orders.from')}
          </label>
          <input
            id="audit-from"
            type="date"
            className="field-input"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="audit-to">
            {t('orders.to')}
          </label>
          <input
            id="audit-to"
            type="date"
            className="field-input"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="md:col-span-2 xl:col-span-5">
          <button type="submit" className="btn btn-primary btn-sm">
            <Search size={14} aria-hidden="true" />
            {t('common.filter')}
          </button>
        </div>
      </form>

      <div className="panel">
        {logs.isLoading ? (
          <Spinner />
        ) : logs.isError || logs.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : logs.data.data.length === 0 ? (
          <EmptyState title={t('audit.empty')} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('audit.at')}</th>
                    <th>{t('audit.action')}</th>
                    <th>{t('audit.subject')}</th>
                    <th>{t('audit.author')}</th>
                    <th>{t('audit.ip')}</th>
                    <th>{t('audit.changes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.data.map((entry) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap text-brume">
                        {formatDateTime(entry.at)}
                      </td>
                      <td className="font-mono text-xs text-or-clair">{entry.action}</td>
                      <td>
                        <p className="text-ivoire">{entry.subject_label ?? '—'}</p>
                        <p className="text-xs text-brume">{entry.subject_type ?? '—'}</p>
                      </td>
                      <td className="text-brume">{entry.author ?? '—'}</td>
                      <td className="font-mono text-xs text-brume">{entry.ip ?? '—'}</td>
                      <td>
                        {entry.changes === null ? (
                          '—'
                        ) : (
                          <details>
                            <summary className="cursor-pointer text-xs text-brume">
                              {t('audit.changes')}
                            </summary>
                            <pre className="mt-2 max-w-md overflow-x-auto text-[11px] text-brume">
                              {JSON.stringify(entry.changes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={logs.data.meta} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
