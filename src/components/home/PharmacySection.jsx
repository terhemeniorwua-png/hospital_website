'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Badge, Chip } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ButtonLink } from '../ui/Button';
import { EmptyState, GridSkeleton, Notice } from '../ui/States';
import { IconCart, IconLock, IconPill, IconSearch } from '../ui/Icon';
import { useAsync } from '../../hooks/useAsync';
import { filterMedications, listMedications } from '../../lib/services/pharmacy';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../providers/AuthProvider';
import { useCart } from '../providers/CartProvider';
import { useToast } from '../providers/ToastProvider';

/**
 * Pharmacy preview on the homepage.
 *
 * Pulls the real catalogue, then applies search / category / price faceting
 * locally because the backend endpoint only accepts `search`. Prescription-only
 * items are labelled, and stock is never claimed (that data is staff-only).
 */
export default function PharmacySection() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { addItem, isInCart } = useCart();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('all');

  const { data, loading, error } = useAsync(async () => {
    if (!isAuthenticated) return [];
    const response = await listMedications({ limit: 60 });
    return response.data || [];
  }, [isAuthenticated]);

  const medicines = useMemo(() => data || [], [data]);

  const categories = useMemo(() => {
    const forms = Array.from(new Set(medicines.map((m) => m.form).filter(Boolean))).sort();
    return ['all', ...forms];
  }, [medicines]);

  const visible = useMemo(
    () =>
      filterMedications(medicines, { search: term, category })
        .slice(0, 4),
    [medicines, term, category],
  );

  function onAdd(medicine) {
    addItem(medicine, 1);
    if (isAuthenticated) {
      toast.success('Added to your basket', `${medicine.name} · ${formatCurrency(medicine.unitPrice)}`);
    }
  }

  return (
    <section className="sa-section bg-canvas" aria-labelledby="pharmacy-heading">
      <div className="sa-container">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="sa-eyebrow">
              <IconPill className="size-4" />
              Hospital pharmacy
            </span>
            <h2 id="pharmacy-heading" className="mt-3 text-3xl font-bold tracking-tight text-ink text-balance sm:text-4xl">
              Medicines, at the price on the shelf
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Our catalogue lists every preparation we stock, with the price you will pay. Prescription items need a
              valid prescription from one of our consultants.
            </p>
          </div>
          <ButtonLink href="/pharmacy" variant="secondary" size="md">
            Open the catalogue
          </ButtonLink>
        </div>

        {!isAuthenticated ? (
          <Notice
            tone="info"
            className="mt-8"
            title="The catalogue reads live from the pharmacy system"
            icon={<IconLock className="size-4" />}
          >
            <p>
              Pricing and availability come from our dispensing system, which is access-controlled. Browse the full
              catalogue, build a basket and sign in when you are ready to check out.
            </p>
          </Notice>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          {/* Catalogue preview */}
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <label htmlFor="pharmacy-preview-search" className="sr-only">
                  Search medicines
                </label>
                <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted" />
                <input
                  id="pharmacy-preview-search"
                  type="search"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Search by name, brand or manufacturer"
                  disabled={!isAuthenticated}
                  className="h-11 w-full rounded-lg border border-line bg-white pr-3.5 pl-11 text-sm text-ink placeholder:text-muted/70 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 focus:outline-none disabled:bg-canvas disabled:text-muted"
                />
              </div>
            </div>

            {categories.length > 2 ? (
              <div className="sa-hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                {categories.map((item) => (
                  <Chip
                    key={item}
                    active={category === item}
                    onClick={() => setCategory(item)}
                    className="shrink-0"
                    disabled={!isAuthenticated}
                  >
                    {item === 'all' ? 'All' : `${item}s`.replace(/ss$/, 's')}
                  </Chip>
                ))}
              </div>
            ) : null}

            <div className="mt-5">
              {!isAuthenticated ? (
                <LockedCataloguePreview />
              ) : loading ? (
                <GridSkeleton count={4} className="sm:grid-cols-2" />
              ) : error ? (
                <Notice tone="danger" title="The pharmacy catalogue is unavailable">
                  <p>{error.message}</p>
                </Notice>
              ) : visible.length === 0 ? (
                <EmptyState
                  compact
                  icon={<IconSearch className="size-6" />}
                  title="No medicines match your search"
                  description="Try a generic name, a brand name or clear the filters."
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setTerm('');
                        setCategory('all');
                      }}
                      className="text-sm font-semibold text-primary-700 hover:underline"
                    >
                      Clear search
                    </button>
                  }
                />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {visible.map((medicine, index) => (
                    <motion.li
                      key={medicine.id}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.25) }}
                    >
                      <Card className="flex h-full flex-col p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/pharmacy/${medicine.id}`}
                              className="text-sm font-semibold text-ink hover:text-primary-700"
                            >
                              {medicine.name}
                            </Link>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {[medicine.genericName, medicine.brandName].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {medicine.requiresPrescription ? (
                            <Badge tone="warning" size="sm">
                              Rx only
                            </Badge>
                          ) : (
                            <Badge tone="success" size="sm">
                              Over the counter
                            </Badge>
                          )}
                        </div>
                        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                          <div>
                            <p className="text-lg font-bold text-ink tabular-nums">{formatCurrency(medicine.unitPrice)}</p>
                            <p className="text-xs text-muted">per {medicine.unitOfMeasure || 'unit'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAdd(medicine)}
                            aria-label={`Add ${medicine.name} to basket`}
                            className="grid size-10 place-items-center rounded-full bg-primary-600 text-white transition hover:bg-primary-700"
                          >
                            <IconCart className={isInCart(medicine.id) ? 'size-5 text-primary-300' : 'size-5'} />
                          </button>
                        </div>
                      </Card>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Basket / guidance rail */}
          <aside className="space-y-4">
            <Card className="p-5">
              <h3 className="text-base font-semibold text-ink">How collection works</h3>
              <ol className="mt-4 space-y-3.5 text-sm text-muted">
                {[
                  'Add medicines to your basket on this device.',
                  'Sign in so we know which prescription applies to you.',
                  'Submit the basket to the pharmacy counter.',
                  'A pharmacist verifies your prescription and confirms stock.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <ButtonLink href="/checkout" variant="primary" size="md" className="mt-5 w-full">
                Review basket
              </ButtonLink>
            </Card>

            <Card className="border-warning-100 bg-warning-50 p-5">
              <h3 className="text-sm font-semibold text-warning-700">About prescriptions</h3>
              <p className="mt-2 text-sm leading-relaxed text-warning-700/85">
                Medicines marked “Rx only” require a prescription issued by a consultant at this hospital. Our
                pharmacist checks every prescription against your record before dispensing.
              </p>
              <Link href="/resources#medicines" className="mt-3 inline-block text-sm font-semibold text-warning-700 hover:underline">
                Read the medicines guide
              </Link>
            </Card>
          </aside>
        </div>
      </div>
    </section>
  );
}

function LockedCataloguePreview() {
  const items = [
    { name: 'Metformin 500mg', form: 'Tablet', rx: true },
    { name: 'Amlodipine 5mg', form: 'Tablet', rx: true },
    { name: 'Paracetamol 500mg', form: 'Tablet', rx: false },
    { name: 'Amoxicillin 500mg', form: 'Capsule', rx: true },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item, index) => (
        <Card key={item.name} className="flex h-full flex-col p-4" style={{ opacity: 1 - index * 0.12 }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted">{item.form}</p>
            </div>
            {item.rx ? (
              <Badge tone="warning" size="sm">
                Rx only
              </Badge>
            ) : (
              <Badge tone="success" size="sm">
                OTC
              </Badge>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <span className="text-xs font-medium text-muted">Sign in to view price</span>
            <span className="grid size-9 place-items-center rounded-full bg-canvas text-muted">
              <IconLock className="size-4" />
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
