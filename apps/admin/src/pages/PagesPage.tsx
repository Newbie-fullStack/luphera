import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import {
  createPage,
  deletePage,
  fetchPage,
  fetchPages,
  updatePage,
  type PageInput,
} from '@/lib/api/admin';
import type { PageDetail } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

export function PagesPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const pages = useQuery({ queryKey: ['pages'], queryFn: fetchPages });

  const page = useQuery({
    queryKey: ['page', editingId],
    queryFn: () => fetchPage(editingId === null || editingId === 'new' ? 0 : editingId),
    enabled: typeof editingId === 'number',
  });

  const remove = useMutation({
    mutationFn: (id: number) => deletePage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages'] });
      setEditingId(null);
      setFeedback(t('common.delete'));
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const selected = typeof editingId === 'number' ? page.data : null;

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={t('nav.groupRelation')}
        title={t('pages.title')}
        subtitle={t('pages.subtitle')}
        actions={
          can('content.manage') ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingId('new');
                setFeedback(null);
              }}
            >
              <Plus size={14} aria-hidden="true" />
              {t('pages.new')}
            </button>
          ) : undefined
        }
      />

      {feedback !== null ? (
        <p className="text-xs text-brume" role="status">
          {feedback}
        </p>
      ) : null}

      <div className="panel">
        {pages.isLoading ? (
          <Spinner />
        ) : pages.isError || pages.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : pages.data.length === 0 ? (
          <EmptyState title={t('pages.noPages')} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('pages.pageTitle')}</th>
                  <th>{t('pages.slug')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.date')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pages.data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-ivoire">{entry.title}</td>
                    <td className="font-mono text-xs text-brume">/{entry.slug}</td>
                    <td>
                      <span
                        className={
                          entry.is_published ? 'badge badge-ok' : 'badge badge-warn'
                        }
                      >
                        {entry.is_published ? t('pages.published') : t('pages.draft')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-brume">
                      {formatDateTime(entry.updated_at)}
                    </td>
                    <td className="actions">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingId(entry.id);
                            setFeedback(null);
                          }}
                        >
                          {can('content.manage') ? t('common.edit') : t('common.close')}
                        </button>
                        {can('content.manage') ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              if (window.confirm(t('pages.deleteConfirm'))) {
                                remove.mutate(entry.id);
                              }
                            }}
                          >
                            {t('common.delete')}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingId === 'new' ? (
        <PageEditor
          key="new"
          page={null}
          onSaved={(saved) => {
            void queryClient.invalidateQueries({ queryKey: ['pages'] });
            setEditingId(saved.id);
            setFeedback(t('pages.created'));
          }}
          onCancel={() => {
            setEditingId(null);
          }}
        />
      ) : null}

      {typeof editingId === 'number' && page.isLoading ? <Spinner /> : null}

      {selected !== null && selected !== undefined ? (
        <PageEditor
          key={selected.id}
          page={selected}
          onSaved={(saved) => {
            void queryClient.invalidateQueries({ queryKey: ['pages'] });
            queryClient.setQueryData(['page', saved.id], saved);
            setFeedback(t('pages.updated'));
          }}
          onCancel={() => {
            setEditingId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PageEditor({
  page,
  onSaved,
  onCancel,
}: {
  page: PageDetail | null;
  onSaved: (saved: PageDetail) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [values, setValues] = useState<PageInput>({
    title: page?.title ?? '',
    slug: page?.slug ?? '',
    body: page?.body ?? '',
    meta_title: page?.meta_title ?? '',
    meta_description: page?.meta_description ?? '',
    is_published: page?.is_published ?? false,
  });

  const save = useMutation({
    mutationFn: () =>
      page === null ? createPage(values) : updatePage(page.id, values),
    onSuccess: (saved) => {
      onSaved(saved);
      setFeedback(page === null ? t('pages.created') : t('pages.updated'));
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="panel-head">
        <h2 className="panel-title">{page === null ? t('pages.new') : page.title}</h2>
        <button
          type="button"
          className="text-[10px] tracking-[0.16em] text-brume uppercase hover:text-ivoire"
          onClick={onCancel}
        >
          {t('common.close')}
        </button>
      </div>
      <div className="panel-body grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="page-title">
              {t('pages.pageTitle')}
            </label>
            <input
              id="page-title"
              className="field-input"
              value={values.title}
              onChange={(event) => {
                setValues({ ...values, title: event.target.value });
              }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="page-slug">
              {t('pages.slug')}
            </label>
            <input
              id="page-slug"
              className="field-input"
              value={values.slug ?? ''}
              onChange={(event) => {
                setValues({ ...values, slug: event.target.value });
              }}
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="page-body">
            {t('pages.body')}
          </label>
          <textarea
            id="page-body"
            className="field-textarea"
            rows={12}
            value={values.body}
            onChange={(event) => {
              setValues({ ...values, body: event.target.value });
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="page-meta-title">
              {t('pages.metaTitle')}
            </label>
            <input
              id="page-meta-title"
              className="field-input"
              value={values.meta_title ?? ''}
              onChange={(event) => {
                setValues({ ...values, meta_title: event.target.value });
              }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="page-meta-description">
              {t('pages.metaDescription')}
            </label>
            <input
              id="page-meta-description"
              className="field-input"
              value={values.meta_description ?? ''}
              onChange={(event) => {
                setValues({ ...values, meta_description: event.target.value });
              }}
            />
          </div>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={values.is_published ?? false}
            onChange={(event) => {
              setValues({ ...values, is_published: event.target.checked });
            }}
          />
          {t('pages.published')}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={save.isPending || values.title.trim() === '' || values.body.trim() === ''}
          >
            {save.isPending ? t('common.saving') : t('common.save')}
          </button>
          {feedback !== null ? (
            <p className="text-xs text-brume" role="status">
              {feedback}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
