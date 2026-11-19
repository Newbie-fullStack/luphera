import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import {
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  updateCoupon,
  type CouponInput,
} from '@/lib/api/admin';
import type { Coupon } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate, formatMAD } from '@/lib/format';

interface FormState {
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  maxDiscount: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  code: '',
  type: 'percentage',
  value: '',
  maxDiscount: '',
  minSubtotal: '',
  startsAt: '',
  endsAt: '',
  maxUses: '',
  isActive: true,
};

function toDateInput(iso: string | null): string {
  return iso === null ? '' : iso.slice(0, 10);
}

function optionalNumber(value: string): number | null {
  return value === '' ? null : Number(value);
}

export function CouponsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [feedback, setFeedback] = useState<string | null>(null);

  const coupons = useQuery({
    queryKey: ['coupons', q, page],
    queryFn: () => fetchCoupons({ q, page }),
  });

  const reset = (): void => {
    setEditing(null);
    setForm(EMPTY);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload: CouponInput = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: Number(form.value),
        max_discount_cents: optionalNumber(form.maxDiscount),
        min_subtotal_cents: Number(form.minSubtotal === '' ? '0' : form.minSubtotal),
        starts_at: form.startsAt === '' ? null : form.startsAt,
        ends_at: form.endsAt === '' ? null : form.endsAt,
        max_uses: optionalNumber(form.maxUses),
        is_active: form.isActive,
      };

      return editing === null ? createCoupon(payload) : updateCoupon(editing.id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setFeedback(editing === null ? t('coupons.created') : t('coupons.updated'));
      reset();
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const remove = useMutation({
    mutationFn: (coupon: Coupon) => deleteCoupon(coupon.id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setFeedback(result === null ? t('common.delete') : t('coupons.deactivated'));
    },
    onError: (cause) => {
      setFeedback(cause instanceof ApiError ? cause.message : t('common.error'));
    },
  });

  const startEdit = (coupon: Coupon): void => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      maxDiscount: coupon.max_discount_cents === null ? '' : String(coupon.max_discount_cents),
      minSubtotal: String(coupon.min_subtotal_cents),
      startsAt: toDateInput(coupon.starts_at),
      endsAt: toDateInput(coupon.ends_at),
      maxUses: coupon.max_uses === null ? '' : String(coupon.max_uses),
      isActive: coupon.is_active,
    });
    setFeedback(null);
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={t('nav.groupRelation')}
        title={t('coupons.title')}
        subtitle={t('coupons.subtitle')}
      />

      {feedback !== null ? (
        <p className="text-xs text-brume" role="status">
          {feedback}
        </p>
      ) : null}

      <form
        className="panel grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <div className="sm:col-span-2 xl:col-span-4">
          <h2 className="panel-title">{editing === null ? t('coupons.new') : t('common.edit')}</h2>
        </div>
        <div>
          <label className="field-label" htmlFor="coupon-code">
            {t('coupons.code')}
          </label>
          <input
            id="coupon-code"
            className="field-input uppercase"
            value={form.code}
            onChange={(event) => {
              setForm({ ...form, code: event.target.value });
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="coupon-type">
            {t('coupons.type')}
          </label>
          <select
            id="coupon-type"
            className="field-select"
            value={form.type}
            onChange={(event) => {
              setForm({
                ...form,
                type: event.target.value === 'fixed' ? 'fixed' : 'percentage',
              });
            }}
          >
            <option value="percentage">{t('coupons.percentage')}</option>
            <option value="fixed">{t('coupons.fixed')}</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="coupon-value">
            {t('coupons.value')}
          </label>
          <input
            id="coupon-value"
            type="number"
            min={1}
            className="field-input"
            value={form.value}
            onChange={(event) => {
              setForm({ ...form, value: event.target.value });
            }}
          />
          <p className="field-hint">{t('coupons.valueHint')}</p>
        </div>
        <div>
          <label className="field-label" htmlFor="coupon-max-uses">
            {t('coupons.maxUses')}
          </label>
          <input
            id="coupon-max-uses"
            type="number"
            min={1}
            className="field-input"
            value={form.maxUses}
            onChange={(event) => {
              setForm({ ...form, maxUses: event.target.value });
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="coupon-max-discount">
            {t('coupons.maxDiscount')}
          </label>
          <input
            id="coupon-max-discount"
            type="number"
            min={0}
            className="field-input"
            value={form.maxDiscount}
            onChange={(event) => {
              setForm({ ...form, maxDiscount: event.target.value });
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="coupon-min-subtotal">
            {t('coupons.minSubtotal')}
          </label>
          <input
            id="coupon-min-subtotal"
            type="number"
            min={0}
            className="field-input"
            value={form.minSubtotal}
            onChange={(event) => {
              setForm({ ...form, minSubtotal: event.target.value });
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="coupon-starts">
            {t('coupons.startsAt')}
          </label>
          <input
            id="coupon-starts"
            type="date"
            className="field-input"
            value={form.startsAt}
            onChange={(event) => {
              setForm({ ...form, startsAt: event.target.value });
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="coupon-ends">
            {t('coupons.endsAt')}
          </label>
          <input
            id="coupon-ends"
            type="date"
            className="field-input"
            value={form.endsAt}
            onChange={(event) => {
              setForm({ ...form, endsAt: event.target.value });
            }}
          />
        </div>
        <label className="checkbox self-end pb-2">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => {
              setForm({ ...form, isActive: event.target.checked });
            }}
          />
          {t('coupons.usable')}
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-4">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={save.isPending || form.code === '' || form.value === ''}
          >
            <Plus size={13} aria-hidden="true" />
            {editing === null ? t('common.create') : t('common.save')}
          </button>
          {editing !== null ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
              {t('common.cancel')}
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{t('coupons.title')}</h2>
          <input
            className="field-input max-w-56"
            placeholder={t('coupons.code')}
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
          />
        </div>
        {coupons.isLoading ? (
          <Spinner />
        ) : coupons.isError || coupons.data === undefined ? (
          <p className="p-6 text-err">{t('common.error')}</p>
        ) : coupons.data.data.length === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('coupons.code')}</th>
                    <th>{t('coupons.type')}</th>
                    <th className="num">{t('coupons.value')}</th>
                    <th className="num">{t('coupons.used')}</th>
                    <th>{t('coupons.endsAt')}</th>
                    <th>{t('common.status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {coupons.data.data.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="font-medium text-ivoire">{coupon.code}</td>
                      <td>{t(`coupons.${coupon.type}`)}</td>
                      <td className="num">
                        {coupon.type === 'percentage'
                          ? `${coupon.value} %`
                          : formatMAD(coupon.value)}
                      </td>
                      <td className="num">
                        {coupon.used_count}
                        {coupon.max_uses === null ? '' : ` / ${coupon.max_uses}`}
                      </td>
                      <td className="whitespace-nowrap text-brume">
                        {coupon.ends_at === null ? t('coupons.noExpiry') : formatDate(coupon.ends_at)}
                      </td>
                      <td>
                        <span className={coupon.is_active ? 'badge badge-ok' : 'badge badge-muted'}>
                          {coupon.is_active ? t('coupons.usable') : t('coupons.inactive')}
                        </span>
                      </td>
                      <td className="actions">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              startEdit(coupon);
                            }}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              if (window.confirm(t('coupons.deactivate'))) {
                                remove.mutate(coupon);
                              }
                            }}
                          >
                            {coupon.used_count > 0 ? t('coupons.deactivate') : t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={coupons.data.meta} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
