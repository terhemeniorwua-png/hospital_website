'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader, PageBody, PageSection } from '../components/layout/PageShell';
import { Card } from '../components/ui/Card';
import { Badge, Chip } from '../components/ui/Badge';
import { Button, ButtonLink } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Form';
import { EmptyState, ErrorState, GridSkeleton, Notice } from '../components/ui/States';
import { Pagination } from '../components/ui/Pagination';
import { IconCart, IconLock, IconPill, IconSearch } from '../components/ui/Icon';
import { useAsync, useDebounced } from '../hooks/useAsync';
import { filterMedications, listMedications, MEDICATION_SORTS, PRICE_RANGES, deriveCategories } from '../lib/services/pharmacy';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../components/providers/AuthProvider';
import { useCart } from '../components/providers/CartProvider';
import { useToast } from '../components/providers/ToastProvider';

const PAGE_SIZE = 24;

/**
 * Pharmacy catalogue.
 *
 * Reads GET /pharmacy/medications. The endpoint only supports `search` plus
 * pagination, so category, price and sort are applied client-side over the
 * fetched page. Stock counts are never shown — /pharmacy/inventory is
 * staff-only, and claiming a count we cannot read would be a lie.
 */
export default function PharmacyPage() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { addItem, isInCart, quantityOf, count } = useCart();
  const { toast } = useToast();

  const [term, setTerm] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [page, setPage] = useState(1);
  const debouncedTerm = useDebounced(term, 350);

  const { data, loading, error, reload } = useAsync(async () => {
    if (!isAuthenticated) return { items: [], pagination: null };
    const response = await listMedications({
      limit: 200,
      page: 1,
      search: debouncedTerm || undefined,
    });
    return { items: response.data || [], pagination: response.pagination };
  }, [isAuthenticated, debouncedTerm]);

  const allMedicines = useMemo(() => data?.items || [], [data]);
  const categories = useMemo(() => deriveCategories(allMedicines), [allMedicines]);

  const filtered = useMemo(
    () => filterMedications(allMedicines, { search: '', category, priceRange, sort }),
    [allMedicines, category, priceRange, sort],
  );

  /* Client-side pagination over the filtered set. */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  function onAdd(medicine) {
    addItem(medicine, 1);
    if (isAuthenticated) {
      toast.success('Added to your basket', `${medicine.name} · ${formatCurrency(medicine.unitPrice)}`);
    }
  }

  function resetFilters() {
    setTerm('');
    setCategory('all');
    setPriceRange('');
    setSort('name-asc');
    setPage(1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Hospital pharmacy"
        title="Medicine catalogue"
        description="Every preparation we stock, at the price you will pay at the counter. Prescription-only items are marked, and your basket is kept on this device until you sign in."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Pharmacy' }]}
        actions={
          <>
            <ButtonLink href="/cart" variant="secondary" size="lg">
              <IconCart className="size-5" />
              Basket{count > 0 ? ` (${count})` : ''}
            </ButtonLink>
            <ButtonLink href="/checkout" variant="primary" size="lg">
              Checkout
            </ButtonLink>
          </>
        }
      />

      <PageBody>
        {/* Filter bar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <label htmlFor="medicine-search" className="sr-only">
              Search the catalogue
            </label>
            <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted" />
            <Input
              id="medicine-search"
              type="search"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, generic, brand or manufacturer"
              className="pl-11"
              containerClassName="w-full"
              disabled={!isAuthenticated}
            />
          </div>
          <Select
            label="Form"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            options={[{ key: 'all', value: 'all', label: 'All forms' }, ...categories.map((c) => ({ value: c, label: `${c}s`.replace(/ss$/, 's') }))]}
            disabled={!isAuthenticated}
          />
          <Select
            label="Price"
            value={priceRange}
            onChange={(event) => {
              setPriceRange(event.target.value);
              setPage(1);
            }}
            options={PRICE_RANGES.map((r) => ({ value: r.key, label: r.label }))}
            disabled={!isAuthenticated}
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            options={MEDICATION_SORTS.map((s) => ({ value: s.key, label: s.label }))}
            disabled={!isAuthenticated}
            containerClassName="lg:col-span-2"
          />
        </div>

        {categories.length > 1 ? (
          <div className="sa-hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            <Chip
              active={category === 'all'}
              onClick={() => {
                setCategory('all');
                setPage(1);
              }}
              className="shrink-0"
              disabled={!isAuthenticated}
            >
              All medicines
            </Chip>
            {categories.map((item) => (
              <Chip
                key={item}
                active={category === item}
                onClick={() => {
                  setCategory(item);
                  setPage(1);
                }}
                className="shrink-0"
                disabled={!isAuthenticated}
              >
                {`${item}s`.replace(/ss$/, 's')}
              </Chip>
            ))}
          </div>
        ) : null}

        {/* Results */}
        <div className="mt-8">
          {!isAuthenticated ? (
            <Card className="p-6 sm:p-10">
              <div className="mx-auto max-w-lg text-center">
                <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary-50 text-primary-600">
                  <IconLock className="size-7" />
                </span>
                <h2 className="text-lg font-semibold text-ink">The catalogue reads live from the pharmacy system</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Prices and preparation details come from our dispensing system, which is access-controlled. You can
                  browse this page and build a basket, then sign in when you are ready to check out.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                  <ButtonLink href="/login" variant="primary" size="lg">
                    Sign in
                  </ButtonLink>
                  <ButtonLink href="/register" variant="secondary" size="lg">
                    Create an account
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ) : loading ? (
            <GridSkeleton count={9} />
          ) : error ? (
            <ErrorState title="The pharmacy catalogue is unavailable" description={error.message} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<IconSearch className="size-6" />}
              title="No medicines match your filters"
              description="Try a generic name, a brand name, or widen the price range."
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Showing <span className="font-medium text-ink">{visible.length}</span> of{' '}
                  <span className="font-medium text-ink">{filtered.length}</span> medicines
                </p>
                {(term || category !== 'all' || priceRange) && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Clear filters
                  </Button>
                )}
              </div>

              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((medicine) => (
                  <li key={medicine.id}>
                    <MedicineCard
                      medicine={medicine}
                      inCart={isInCart(medicine.id)}
                      quantity={quantityOf(medicine.id)}
                      onAdd={() => onAdd(medicine)}
                    />
                  </li>
                ))}
              </ul>

              <Pagination
                className="mt-8"
                pagination={{ page: currentPage, limit: PAGE_SIZE, total: filtered.length, totalPages }}
                onPageChange={setPage}
              />
            </>
          )}
        </div>

        <PageSection>
          <Notice tone="info" title="About prescriptions and stock" icon={<IconPill className="size-4" />}>
            <p>
              Items marked <strong>Rx only</strong> require a valid prescription from one of our consultants, which a
              pharmacist verifies against your record before dispensing. We do not publish stock counts on this page —
              availability is confirmed by the pharmacy counter when your order is processed.
            </p>
          </Notice>
        </PageSection>
      </PageBody>
    </>
  );
}

function MedicineCard({ medicine, inCart, quantity, onAdd }) {
  return (
    <Card interactive className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <Badge tone={medicine.requiresPrescription ? 'warning' : 'success'} size="sm">
          {medicine.requiresPrescription ? 'Rx only' : 'Over the counter'}
        </Badge>
        {medicine.form ? <span className="text-xs font-medium text-muted">{medicine.form}</span> : null}
      </div>

      <h3 className="mt-3 text-sm font-semibold text-ink">
        <a href={`/pharmacy/${medicine.id}`} className="hover:text-primary-700">
          {medicine.name}
        </a>
      </h3>
      <p className="mt-1 text-xs text-muted">
        {[medicine.genericName, medicine.brandName].filter(Boolean).join(' · ')}
      </p>
      {medicine.manufacturer ? (
        <p className="mt-1 truncate text-xs text-muted/80">{medicine.manufacturer}</p>
      ) : null}

      <div className="mt-auto pt-4">
        <p className="text-lg font-bold text-ink tabular-nums">{formatCurrency(medicine.unitPrice)}</p>
        <p className="text-xs text-muted">per {medicine.unitOfMeasure || 'unit'}</p>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${medicine.name} to basket`}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary-600 text-sm font-semibold text-white transition hover:bg-primary-700 active:scale-[0.98]"
        >
          <IconCart className="size-4" />
          {inCart ? `In basket (${quantity})` : 'Add to basket'}
        </button>
      </div>
    </Card>
  );
}
