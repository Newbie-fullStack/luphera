import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DList, DsSection } from '@/components/ui/DsSection';
import { TextField } from '@/components/ui/Field';
import { ShippingProgress } from '@/components/ui/ShippingProgress';
import { SizeSelector, type SizeOption } from '@/components/ui/SizeSelector';
import { Stepper } from '@/components/ui/Stepper';
import { Tag } from '@/components/ui/Tag';
import { formatMAD } from '@/lib/format';

const colors = [
  { key: 'nuit', token: '--color-nuit', hex: '#070605' },
  { key: 'obsidienne', token: '--color-obsidienne', hex: '#100d0a' },
  { key: 'charbon', token: '--color-charbon', hex: '#1b1712' },
  { key: 'or', token: '--color-or', hex: '#c9a24b' },
  { key: 'orClair', token: '--color-or-clair', hex: '#f0d589' },
  { key: 'orProfond', token: '--color-or-profond', hex: '#8a6a26' },
  { key: 'ivoire', token: '--color-ivoire', hex: '#efe6d2' },
  { key: 'texte', token: '--color-texte', hex: '#d3cab6' },
  { key: 'brume', token: '--color-brume', hex: '#9b9283' },
  { key: 'rose', token: '--color-rose', hex: '#e3b7a0' },
  { key: 'err', token: '--color-err', hex: '#e2907f' },
] as const;

const spacing = [4, 8, 16, 24, 32, 48, 64, 96, 128];

const sizes: SizeOption[] = [
  { id: '30', ml: 30, priceCents: 45000 },
  { id: '50', ml: 50, priceCents: 69000 },
  { id: '100', ml: 100, priceCents: 99000 },
];

export function DesignSystemPage() {
  const { t } = useTranslation();
  const [chip, setChip] = useState<'homme' | 'femme' | 'mixte'>('homme');
  const [size, setSize] = useState('50');
  const [quantity, setQuantity] = useState(1);
  const [run, setRun] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setRun(true), 600);

    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    };
  }, []);

  const replay = (): void => {
    setRun(false);
    window.setTimeout(() => setRun(true), 60);
  };

  const copy = (hex: string): void => {
    if (!navigator.clipboard) {
      return;
    }

    navigator.clipboard
      .writeText(hex)
      .then(() => {
        setCopied(hex);
        if (copiedTimer.current !== null) {
          window.clearTimeout(copiedTimer.current);
        }
        copiedTimer.current = window.setTimeout(() => setCopied(null), 1600);
      })
      .catch(() => setCopied(null));
  };

  const motionTracks = [
    { key: 'lux', label: t('designSystem.motion.lux'), easing: 'var(--ease-lux)' },
    { key: 'standard', label: t('designSystem.motion.standard'), easing: 'cubic-bezier(.4,0,.2,1)' },
    { key: 'linear', label: t('designSystem.motion.linear'), easing: 'linear' },
  ] as const;

  return (
    <div className="border-t border-ligne bg-obsidienne">
      <div className="gutter pb-10 pt-14">
        <header className="mb-16 grid max-w-3xl gap-5">
          <p className="eyebrow">{t('designSystem.eyebrow')}</p>
          <h1 className="text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.02]">
            {t('designSystem.title')}
          </h1>
          <p className="max-w-[62ch] text-texte">{t('designSystem.lead')}</p>
        </header>

        <DsSection
          title={t('designSystem.principles.title')}
          subtitle={t('designSystem.principles.subtitle')}
        >
          <div className="grid gap-6 md:grid-cols-3">
            {(['instinct', 'gold', 'slowness'] as const).map((key) => (
              <div key={key} className="grid content-start gap-2.5 border border-ligne bg-charbon p-6">
                <h3 className="font-display text-2xl text-ivoire">
                  {t(`designSystem.principles.${key}.title`)}
                </h3>
                <p className="text-[15px] leading-relaxed text-texte">
                  {t(`designSystem.principles.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </DsSection>

        <DsSection
          title={t('designSystem.colors.title')}
          subtitle={t('designSystem.colors.subtitle')}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))] gap-4">
            {colors.map((color) => (
              <button
                key={color.key}
                type="button"
                onClick={() => copy(color.hex)}
                aria-label={t('designSystem.colors.copyLabel', {
                  name: t(`designSystem.colors.names.${color.key}.name`),
                })}
                className="group grid border border-ligne bg-charbon text-left transition-[border-color,transform] duration-500 ease-lux hover:-translate-y-[3px] hover:border-or"
              >
                <span
                  aria-hidden="true"
                  className="h-[92px] border-b border-ligne"
                  style={{ backgroundColor: `var(${color.token})` }}
                />
                <span className="grid gap-0.5 px-3.5 py-3">
                  <b className="text-[15px] font-medium text-ivoire">
                    {t(`designSystem.colors.names.${color.key}.name`)}
                  </b>
                  <code className="select-all font-mono text-[12.5px] text-or-clair">
                    {color.hex}
                  </code>
                  <small className="text-[12.5px] leading-snug text-brume">
                    {t(`designSystem.colors.names.${color.key}.usage`)}
                  </small>
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            <div
              aria-hidden="true"
              className="h-16 border border-ligne bg-[image:var(--or-gradient)]"
            />
            <div className="flex flex-wrap justify-between gap-3 text-[13px] text-brume">
              <span>{t('designSystem.colors.gradient')}</span>
              <code className="font-mono text-or-clair">--or-gradient</code>
            </div>
          </div>

          <p aria-live="polite" className="min-h-5 text-[12px] uppercase tracking-[.24em] text-or-clair">
            {copied ? `${t('common.copied')} · ${copied}` : ''}
          </p>
        </DsSection>

        <DsSection
          title={t('designSystem.typography.title')}
          subtitle={t('designSystem.typography.subtitle')}
        >
          <div className="grid border-t border-ligne">
            <div className="grid items-baseline gap-3 border-b border-ligne py-5 sm:grid-cols-[minmax(120px,.28fr)_1fr] sm:gap-7">
              <div className="grid gap-0.5 text-[12.5px] text-brume">
                <b className="text-[11px] font-medium uppercase tracking-[.26em] text-or">
                  {t('designSystem.typography.wordmark.label')}
                </b>
                {t('designSystem.typography.wordmark.note')}
              </div>
              <div className="gold-text font-display text-[clamp(36px,7vw,96px)] leading-none tracking-[.06em]">
                {t('designSystem.typography.wordmark.sample')}
              </div>
            </div>

            <div className="grid items-baseline gap-3 border-b border-ligne py-5 sm:grid-cols-[minmax(120px,.28fr)_1fr] sm:gap-7">
              <div className="grid gap-0.5 text-[12.5px] text-brume">
                <b className="text-[11px] font-medium uppercase tracking-[.26em] text-or">
                  {t('designSystem.typography.heading.label')}
                </b>
                {t('designSystem.typography.heading.note')}
              </div>
              <div className="font-display text-[clamp(30px,4.2vw,56px)] leading-[1.06] text-ivoire">
                {t('designSystem.typography.heading.sample')}
              </div>
            </div>

            <div className="grid items-baseline gap-3 border-b border-ligne py-5 sm:grid-cols-[minmax(120px,.28fr)_1fr] sm:gap-7">
              <div className="grid gap-0.5 text-[12.5px] text-brume">
                <b className="text-[11px] font-medium uppercase tracking-[.26em] text-or">
                  {t('designSystem.typography.subheading.label')}
                </b>
                {t('designSystem.typography.subheading.note')}
              </div>
              <div className="font-display text-[clamp(22px,2.4vw,30px)] leading-tight text-ivoire">
                {t('designSystem.typography.subheading.sample')}
              </div>
            </div>

            <div className="grid items-baseline gap-3 border-b border-ligne py-5 sm:grid-cols-[minmax(120px,.28fr)_1fr] sm:gap-7">
              <div className="grid gap-0.5 text-[12.5px] text-brume">
                <b className="text-[11px] font-medium uppercase tracking-[.26em] text-or">
                  {t('designSystem.typography.body.label')}
                </b>
                {t('designSystem.typography.body.note')}
              </div>
              <p className="max-w-[56ch] text-[17px] leading-[1.7]">
                {t('designSystem.typography.body.sample')}
              </p>
            </div>

            <div className="grid items-baseline gap-3 border-b border-ligne py-5 sm:grid-cols-[minmax(120px,.28fr)_1fr] sm:gap-7">
              <div className="grid gap-0.5 text-[12.5px] text-brume">
                <b className="text-[11px] font-medium uppercase tracking-[.26em] text-or">
                  {t('designSystem.typography.label.label')}
                </b>
                {t('designSystem.typography.label.note')}
              </div>
              <p className="eyebrow">{t('designSystem.typography.label.sample')}</p>
            </div>
          </div>
        </DsSection>

        <DsSection
          title={t('designSystem.spacing.title')}
          subtitle={t('designSystem.spacing.subtitle')}
        >
          <div className="grid gap-2.5">
            {spacing.map((value) => (
              <div
                key={value}
                className="grid grid-cols-[70px_minmax(0,1fr)] items-center gap-4 text-[13px] text-brume"
              >
                <span>{value} px</span>
                <span
                  aria-hidden="true"
                  className="block h-2.5 bg-[image:var(--or-gradient)]"
                  style={{ width: `${Math.min(value * 3, 640)}px`, maxWidth: '100%' }}
                />
              </div>
            ))}
          </div>

          <DList
            items={[
              { term: t('designSystem.spacing.radius'), value: t('designSystem.spacing.radiusValue') },
              { term: t('designSystem.spacing.lines'), value: t('designSystem.spacing.linesValue') },
              { term: t('designSystem.spacing.focus'), value: t('designSystem.spacing.focusValue') },
            ]}
          />
        </DsSection>

        <DsSection
          title={t('designSystem.components.title')}
          subtitle={t('designSystem.components.subtitle')}
        >
          <div className="grid gap-6 md:grid-cols-3">
            <div className="grid content-start gap-4 border border-ligne bg-charbon p-6">
              <h3 className="text-[11px] font-medium uppercase tracking-[.28em] text-or">
                {t('designSystem.components.buttons')}
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button>{t('designSystem.components.primary')}</Button>
                <Button variant="secondary">{t('designSystem.components.secondary')}</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled>{t('designSystem.components.disabled')}</Button>
                <Link to="/boutique" className="lnk">
                  {t('designSystem.components.learnMore')}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="grid content-start gap-4 border border-ligne bg-charbon p-6">
              <h3 className="text-[11px] font-medium uppercase tracking-[.28em] text-or">
                {t('designSystem.components.choices')}
              </h3>
              <div role="group" aria-label={t('designSystem.components.chipsLabel')} className="flex flex-wrap gap-3">
                {(['homme', 'femme', 'mixte'] as const).map((key) => (
                  <Chip
                    key={key}
                    pressed={chip === key}
                    onPressedChange={() => setChip(key)}
                  >
                    {t(`designSystem.components.${key}`)}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Tag>{t('designSystem.components.tagNew')}</Tag>
                <Tag>{t('designSystem.components.tagLimited')}</Tag>
                <Tag tone="rose">{t('designSystem.components.tagWomen')}</Tag>
              </div>
            </div>

            <div className="grid content-start gap-4 border border-ligne bg-charbon p-6">
              <h3 className="text-[11px] font-medium uppercase tracking-[.28em] text-or">
                {t('designSystem.components.field')}
              </h3>
              <form
                className="grid gap-4"
                noValidate
                onSubmit={(event) => event.preventDefault()}
              >
                <TextField
                  id="ds-email"
                  type="email"
                  autoComplete="email"
                  label={t('designSystem.components.emailLabel')}
                  placeholder={t('designSystem.components.emailPlaceholder')}
                  hint={t('designSystem.components.emailHint')}
                />
                <Button type="submit">{t('designSystem.components.subscribe')}</Button>
              </form>
            </div>
          </div>
        </DsSection>

        <DsSection
          title={t('designSystem.motion.title')}
          subtitle={t('designSystem.motion.subtitle')}
        >
          <div className="grid gap-4">
            {motionTracks.map((track) => (
              <div
                key={track.key}
                className="grid items-center gap-4 text-[13px] text-brume sm:grid-cols-[190px_1fr]"
              >
                <span>{track.label}</span>
                <div className="relative h-7 border-b border-ligne">
                  <i
                    aria-hidden="true"
                    className="absolute top-1/2 size-3 -translate-y-1/2 rotate-45 bg-or transition-[left] duration-[1400ms]"
                    style={{
                      left: run ? 'calc(100% - 12px)' : '0',
                      transitionTimingFunction: track.easing,
                    }}
                  />
                </div>
              </div>
            ))}
            <div>
              <Button variant="secondary" onClick={replay}>
                {t('designSystem.motion.replay')}
              </Button>
            </div>
          </div>

          <DList
            items={[
              { term: t('designSystem.motion.durations'), value: t('designSystem.motion.durationsValue') },
              { term: t('designSystem.motion.appearance'), value: t('designSystem.motion.appearanceValue') },
              { term: t('designSystem.motion.hover'), value: t('designSystem.motion.hoverValue') },
              { term: t('designSystem.motion.progress'), value: t('designSystem.motion.progressValue') },
            ]}
          />
        </DsSection>

        <DsSection
          title={t('designSystem.shopComponents.title')}
          subtitle={t('designSystem.shopComponents.subtitle')}
        >
          <div className="flex flex-wrap items-start gap-8">
            <div className="grid gap-2.5">
              <span className="eyebrow">{t('designSystem.shopComponents.quantity')}</span>
              <Stepper
                value={quantity}
                onChange={setQuantity}
                decreaseLabel={t('cart.decrease')}
                increaseLabel={t('cart.increase')}
              />
            </div>

            <div className="grid w-full max-w-sm gap-2.5">
              <span className="eyebrow">{t('designSystem.shopComponents.size')}</span>
              <SizeSelector
                options={sizes}
                value={size}
                onChange={setSize}
                label={t('designSystem.shopComponents.size')}
              />
            </div>

            <div className="grid w-full max-w-xs gap-2.5">
              <span className="eyebrow">{t('designSystem.shopComponents.freeShipping')}</span>
              <ShippingProgress
                subtotalCents={56000}
                thresholdCents={80000}
                freeLabel={t('cart.freeShipping')}
                renderRemaining={(remaining) => (
                  <>{t('designSystem.shopComponents.freeShippingText', { amount: formatMAD(remaining) })}</>
                )}
                progressLabel={t('cart.freeShippingProgress')}
              />
            </div>

            <div className="grid w-full max-w-xs gap-2.5">
              <span className="eyebrow">{t('designSystem.shopComponents.errorField')}</span>
              <TextField
                id="ds-phone"
                label={t('designSystem.shopComponents.phone')}
                defaultValue="06 12"
                error={t('designSystem.shopComponents.phoneError')}
              />
            </div>
          </div>
        </DsSection>

        <DsSection
          title={t('designSystem.routes.title')}
          subtitle={t('designSystem.routes.subtitle')}
        >
          <DList
            items={[
              { term: t('designSystem.routes.routesLabel'), value: <code className="font-mono text-[13px] text-or-clair">{t('designSystem.routes.routesValue')}</code> },
              { term: t('designSystem.routes.products'), value: t('designSystem.routes.productsValue') },
              { term: t('designSystem.routes.cart'), value: t('designSystem.routes.cartValue') },
              { term: t('designSystem.routes.order'), value: t('designSystem.routes.orderValue') },
              { term: t('designSystem.routes.toProvide'), value: t('designSystem.routes.toProvideValue') },
            ]}
          />
        </DsSection>

        <DsSection
          title={t('designSystem.scene.title')}
          subtitle={t('designSystem.scene.subtitle')}
        >
          <DList
            items={[
              { term: t('designSystem.scene.camera'), value: t('designSystem.scene.cameraValue') },
              { term: t('designSystem.scene.rotation'), value: t('designSystem.scene.rotationValue') },
              { term: t('designSystem.scene.particles'), value: t('designSystem.scene.particlesValue') },
              { term: t('designSystem.scene.light'), value: t('designSystem.scene.lightValue') },
              { term: t('designSystem.scene.tint'), value: t('designSystem.scene.tintValue') },
              { term: t('designSystem.scene.fallback'), value: t('designSystem.scene.fallbackValue') },
            ]}
          />
        </DsSection>
      </div>
    </div>
  );
}
