import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/ui/Button';
import { fetchWishlist, removeFromWishlist } from '@/features/auth/api';
import { ProductCard } from '@/features/catalog/components/ProductCard';

export function AccountWishlistPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const wishlist = useQuery({ queryKey: ['wishlist'], queryFn: fetchWishlist });
  const [error, setError] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => setError(t('account.wishlist.error')),
  });

  useEffect(() => {
    document.title = `${t('account.wishlist.title')} — Luphéra`;
  }, [t]);

  const items = wishlist.data ?? [];

  return (
    <section className="grid gap-6">
      <header className="grid gap-2">
        <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] leading-tight">{t('account.wishlist.title')}</h2>
        <p className="text-[14px] leading-relaxed text-brume">{t('account.wishlist.lead')}</p>
      </header>

      {error !== null ? (
        <p role="alert" className="border border-[#5a2b2b] bg-[#2a1414] p-4 text-[13px] text-[#e8b4b4]">
          {error}
        </p>
      ) : null}

      {wishlist.isLoading ? (
        <p role="status" className="py-6 text-[11px] uppercase tracking-[.3em] text-brume">
          {t('common.loading')}
        </p>
      ) : items.length === 0 ? (
        <div className="grid gap-5 border border-ligne p-6">
          <p className="text-[15px] text-texte">{t('account.wishlist.empty')}</p>
          <ButtonLink to="/boutique" className="justify-self-start">
            {t('account.wishlist.emptyAction')}
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2">
          {items.map((product) => (
            <li key={product.id} className="grid gap-3">
              <ProductCard product={product} />
              <button
                type="button"
                onClick={() => remove.mutate(product.id)}
                disabled={remove.isPending}
                className="justify-self-start text-[10.5px] uppercase tracking-[.22em] text-brume transition-colors hover:text-[#e8b4b4] disabled:opacity-50"
              >
                {remove.isPending ? t('account.wishlist.removing') : t('account.wishlist.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
