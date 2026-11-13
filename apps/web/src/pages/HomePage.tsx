import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Reveal } from '@/components/ui/Reveal';
import { Tag } from '@/components/ui/Tag';

export function HomePage() {
  const { t } = useTranslation();

  const principles = ['instinct', 'gold', 'slowness'] as const;

  return (
    <>
      <section className="gutter grid min-h-[calc(100svh-104px)] items-center gap-12 pb-20 pt-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-6">
        <div className="grid max-w-xl content-center gap-7">
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1 className="text-[clamp(2.6rem,6vw,5rem)] leading-[1.02] tracking-[.015em]">
            {t('home.title')}
          </h1>
          <p className="max-w-[52ch] text-[clamp(1rem,1.4vw,1.15rem)] leading-relaxed text-texte">
            {t('home.lead')}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <ButtonLink to="/boutique">{t('home.ctaShop')}</ButtonLink>
            <ButtonLink to="/histoire" variant="secondary">
              {t('home.ctaStory')}
            </ButtonLink>
          </div>
          <p className="pt-2 text-[11px] uppercase tracking-[.3em] text-brume">
            {t('home.heroNote')}
          </p>
        </div>

        <div className="relative grid min-h-[360px] place-items-center lg:min-h-[620px]">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(42%_52%_at_62%_48%,rgba(201,162,75,.20),transparent_72%)]"
          />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[78%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-or/30 to-transparent"
          />
          <img
            src="/images/flacons/flacon-noir.webp"
            alt={t('home.bottleAlt')}
            width={305}
            height={1000}
            fetchPriority="high"
            decoding="async"
            className="relative z-10 h-[min(70svh,660px)] w-auto max-w-[min(78vw,340px)] object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,.55)]"
          />
          <span className="absolute bottom-0 right-2 hidden items-center gap-3 text-[10px] uppercase tracking-[.3em] text-brume lg:flex">
            <i aria-hidden="true" className="h-10 w-px bg-gradient-to-b from-or to-transparent" />
            {t('home.scrollCue')}
          </span>
        </div>
      </section>

      <section className="border-t border-ligne bg-obsidienne">
        <div className="gutter py-20">
          <Reveal className="grid gap-10">
            <PageHeader
              eyebrow={t('home.principlesEyebrow')}
              title={t('home.principlesTitle')}
              as="h2"
            />
            <div className="grid gap-6 md:grid-cols-3">
              {principles.map((key) => (
                <article
                  key={key}
                  className="grid content-start gap-3 border border-ligne bg-charbon p-6"
                >
                  <h2 className="font-display text-2xl text-ivoire">
                    {t(`home.principles.${key}.title`)}
                  </h2>
                  <p className="text-[15px] leading-relaxed text-texte">
                    {t(`home.principles.${key}.body`)}
                  </p>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="gutter py-20">
        <Reveal className="grid gap-10">
          <PageHeader eyebrow={t('home.linesEyebrow')} title={t('home.linesTitle')} lead={t('home.linesLead')} as="h2" />
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { key: 'homme', image: '/images/flacons/flacon-noir.webp', tone: 'gold' },
              { key: 'femme', image: '/images/flacons/flacon-aurore.webp', tone: 'rose' },
            ].map((line) => (
              <Link
                key={line.key}
                to={`/boutique?ligne=${line.key}`}
                className="group relative grid overflow-hidden border border-ligne bg-obsidienne transition-colors duration-500 hover:border-or/60"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={line.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-8 transition-transform duration-[900ms] ease-lux group-hover:scale-[1.04]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(201,162,75,.14),transparent_75%)]"
                  />
                </div>
                <div className="grid gap-3 border-t border-ligne p-6">
                  <Tag
                    tone={line.tone === 'rose' ? 'rose' : 'gold'}
                    className="justify-self-start"
                  >
                    {t(`home.${line.key}.title`)}
                  </Tag>
                  <p className="text-[15px] leading-relaxed text-texte">
                    {t(`home.${line.key}.body`)}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[.26em] text-or-clair">
                    {t(`home.${line.key}.cta`)}
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="border-t border-ligne bg-obsidienne">
        <div className="gutter flex flex-wrap items-end justify-between gap-8 py-20">
          <div className="grid max-w-2xl gap-4">
            <p className="eyebrow">{t('home.dsEyebrow')}</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] leading-tight">{t('home.dsTitle')}</h2>
            <p className="text-texte">{t('home.dsLead')}</p>
          </div>
          <ButtonLink to="/design-system" variant="secondary">
            {t('home.dsCta')}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
