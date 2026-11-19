import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Download, Search, Upload } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/features/auth/useAuth';
import {
  adjustStock,
  downloadStockCsv,
  fetchMovements,
  fetchStock,
  importStockCsv,
} from '@/lib/api/admin';
import type { StockRow } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

export function StockPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [selected, setSelected] = useState<StockRow | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState<'adjust' | 'restock'>('restock');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ line: number; message: string }>>([]);

  const low = params.get('low') === '1';
  const page = Number(params.get('page') ?? '1');

  const stock = useQuery({
    queryKey: ['stock', q, low, page],
    queryFn: () => fetchStock({ q, low: low ? true : undefined, page }),
  });

  const movements = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => fetchMovements(),
  });

  const adjust = useMutation({
    mutationFn: () =>
      adjustStock({
        variant_id: selected?.id ?? '',
        delta: Number(delta),
        reason,
        note: note === '' ? undefined : note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelected(null);
      setDelta('');
      setNote('');
      setFeedback(t('stock.adjusted'));
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const importCsv = useMutation({
    mutationFn: (file: File) => importStockCsv(file),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setImportErrors(result.errors);
      setFeedback(
        t('stock.importDone', { updated: result.updated, errors: result.errors.length }),
      );
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const update = (patch: Record<string, string>): void => {
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
        eyebrow={t('nav.groupCatalogue')}
        title={t('stock.title')}
        subtitle={t('stock.subtitle')}
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                void downloadStockCsv();
              }}
            >
              <Download size={14} aria-hidden="true" />
              {t('common.export')}
            </button>
            {can('catalog.manage') ? (
              <label className="btn btn-secondary btn-sm cursor-pointer">
                <Upload size={14} aria-hidden="true" />
                {t('stock.import')}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file !== undefined) {
                      importCsv.mutate(file);
                    }

                    event.target.value = '';
                  }}
                />
              </label>
            ) : null}
          </>
        }
      />

      {feedback !== null ? (
        <p className="text-xs text-brume" role="status">
          {feedback}
        </p>
      ) : null}

      {importErrors.length > 0 ? (
        <ul className="panel panel-body grid gap-1 text-xs text-err">
          {importErrors.map((error) => (
            <li key={`${error.line}-${error.message}`}>
              {t('common.page')} {error.line} — {error.message}
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="panel flex flex-wrap items-end gap-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q });
        }}
      >
        <div className="min-w-56 flex-1">
          <label className="field-label" htmlFor="stock-q">
            {t('common.search')}
          </label>
          <input
            id="stock-q"
            className="field-input"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
            }}
          />
        </div>
        <label className="checkbox pb-2">
          <input
            type="checkbox"
            checked={low}
            onChange={(event) => {
              update({ low: event.target.checked ? '1' : '' });
            }}
          />
          {t('stock.lowOnly')}
        </label>
        <button type="submit" className="btn btn-primary btn-sm">
          <Search size={14} aria-hidden="true" />
          {t('common.filter')}
        </button>
        <p className="field-hint w-full">{t('stock.importHint')}</p>
      </form>

      <div className="panel">
        {stock.isLoading ? (
          <Spinner />
        ) : stock.isError || stock.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : stock.data.data.length === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('stock.product')}</th>
                    <th>{t('products.sku')}</th>
                    <th className="num">{t('stock.stock')}</th>
                    <th className="num">{t('stock.threshold')}</th>
                    <th>{t('common.status')}</th>
                    {can('catalog.manage') ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {stock.data.data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <p className="text-ivoire">{row.product.name}</p>
                        <p className="text-xs text-brume">{row.label ?? '—'}</p>
                      </td>
                      <td className="font-mono text-xs text-brume">{row.sku}</td>
                      <td className="num">{row.stock}</td>
                      <td className="num">{row.threshold}</td>
                      <td>
                        <StatusBadge value={row.status} kind="stock" />
                      </td>
                      {can('catalog.manage') ? (
                        <td className="actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setSelected(row);
                              setDelta('');
                              setNote('');
                              setFeedback(null);
                            }}
                          >
                            {t('stock.adjust')}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              meta={stock.data.meta}
              onChange={(next) => {
                update({ page: String(next) });
              }}
            />
          </>
        )}
      </div>

      {selected !== null ? (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            adjust.mutate();
          }}
        >
          <div className="panel-head">
            <h2 className="panel-title">
              {t('stock.adjustTitle')} · {selected.sku}
            </h2>
            <button
              type="button"
              className="text-[10px] tracking-[0.16em] text-brume uppercase hover:text-ivoire"
              onClick={() => {
                setSelected(null);
              }}
            >
              {t('common.close')}
            </button>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="field-label" htmlFor="stock-delta">
                {t('stock.delta')}
              </label>
              <input
                id="stock-delta"
                type="number"
                className="field-input"
                value={delta}
                onChange={(event) => {
                  setDelta(event.target.value);
                }}
              />
              <p className="field-hint">{t('stock.deltaHint')}</p>
            </div>
            <div>
              <label className="field-label" htmlFor="stock-reason">
                {t('stock.reason')}
              </label>
              <select
                id="stock-reason"
                className="field-select"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value === 'adjust' ? 'adjust' : 'restock');
                }}
              >
                <option value="restock">{t('stock.restock')}</option>
                <option value="adjust">{t('stock.manual')}</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="stock-note">
                {t('stock.note')}
              </label>
              <input
                id="stock-note"
                className="field-input"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                }}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={adjust.isPending || delta === '' || Number(delta) === 0}
              >
                {t('stock.apply')}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{t('stock.movements')}</h2>
        </div>
        {movements.isLoading ? (
          <Spinner />
        ) : movements.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : movements.data.data.length === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('stock.movementDate')}</th>
                  <th>{t('stock.variant')}</th>
                  <th>{t('stock.reason')}</th>
                  <th className="num">{t('stock.movementQty')}</th>
                  <th>{t('stock.movementAuthor')}</th>
                  <th>{t('stock.note')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.data.data.map((movement) => (
                  <tr key={movement.id}>
                    <td className="whitespace-nowrap text-brume">
                      {formatDateTime(movement.at)}
                    </td>
                    <td>
                      <p className="text-ivoire">{movement.sku ?? '—'}</p>
                      <p className="text-xs text-brume">{movement.product ?? '—'}</p>
                    </td>
                    <td>{t(`stock.${movement.reason === 'restock' ? 'restock' : 'manual'}`)}</td>
                    <td className="num">{movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}</td>
                    <td className="text-brume">{movement.author ?? '—'}</td>
                    <td className="text-brume">{movement.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
