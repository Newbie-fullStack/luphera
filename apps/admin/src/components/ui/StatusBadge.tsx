import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

const ORDER_TONES: Record<string, string> = {
  pending: 'badge badge-pending',
  confirmed: 'badge badge-ok',
  preparing: 'badge badge-warn',
  shipped: 'badge badge-ok',
  delivered: 'badge badge-ok',
  cancelled: 'badge badge-danger',
  returned: 'badge badge-danger',
  failed_delivery: 'badge badge-danger',
};

const PRODUCT_TONES: Record<string, string> = {
  draft: 'badge badge-warn',
  active: 'badge badge-ok',
  archived: 'badge badge-muted',
};

const STOCK_TONES: Record<string, string> = {
  in_stock: 'badge badge-ok',
  low_stock: 'badge badge-warn',
  out_of_stock: 'badge badge-danger',
};

const SEGMENT_TONES: Record<string, string> = {
  vip: 'badge badge-pending',
  new: 'badge badge-ok',
  regular: 'badge badge-muted',
  inactive: 'badge badge-warn',
};

type Kind = 'order' | 'product' | 'stock' | 'segment' | 'neutral';

const TONES: Record<Kind, Record<string, string>> = {
  order: ORDER_TONES,
  product: PRODUCT_TONES,
  stock: STOCK_TONES,
  segment: SEGMENT_TONES,
  neutral: {},
};

const LABEL_PREFIX: Record<Kind, string> = {
  order: 'orders.',
  product: 'products.',
  stock: 'stock.',
  segment: 'customers.',
  neutral: '',
};

/**
 * Stock values are snake_case in the API while the French keys are camelCase,
 * so the badge needs an explicit bridge rather than a prefix concatenation.
 */
const STOCK_KEYS: Record<string, string> = {
  in_stock: 'stock.inStock',
  low_stock: 'stock.lowStock',
  out_of_stock: 'stock.outOfStock',
};

export function StatusBadge({
  value,
  kind = 'neutral',
  label,
}: {
  value: string;
  kind?: Kind;
  label?: string;
}) {
  const { t } = useTranslation();
  const className = TONES[kind][value] ?? 'badge badge-muted';
  const key = kind === 'stock' ? (STOCK_KEYS[value] ?? value) : `${LABEL_PREFIX[kind]}${value}`;
  const text = label ?? t(key, { defaultValue: value });

  return <span className={cn(className)}>{text}</span>;
}
