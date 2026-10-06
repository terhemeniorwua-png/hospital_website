'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, PageBody, PageSection, CtaStrip } from '../../../components/layout/PageShell';
import { Card, DetailRow } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { ErrorState, GridSkeleton, Notice } from '../../../components/ui/States';
import { IconCart, IconCheck, IconLock, IconPill } from '../../../components/ui/Icon';
import { useAsync } from '../../../hooks/useAsync';
import { listMedications } from '../../../lib/services/pharmacy';
import { formatCurrency } from '../../../lib/utils';
import { useAuth } from '../../../components/providers/AuthProvider';
import { useCart } from '../../../components/providers/CartProvider';
import { useToast } from '../../../components/providers/ToastProvider';

const QUANTITY_OPTIONS = [1, 2, 3, 6, 10];

/** Single medicine page. Everything shown comes from the catalogue record. */
export default function MedicineDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addItem, isInCart, quantityOf } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const { data, loading, error, reload } = useAsync(async () => {
    if (!isAuthenticated) return null;
    const response = await listMedications({ limit: 200 });
    return (response.data || []).find((medicine) => String(medicine.id) === String(id)) || null;
  }, [isAuthenticated, id]);

  const medicine = data;

  const related = useMemo(() => {
    if (!medicine) return [];
    return (data && Array.isArray(data) ? data : []).filter((item) => item.form === medicine.form).slice(0, 4);
  }, [medicine, data]);

  function onAdd() {
    addItem(medicine, quantity);
    if (isAuthenticated) {
      toast.success(
        'Added to your basket',
        `${quantity} × ${medicine.name} · ${formatCurrency(Number(medicine.unitPrice) * quantity)}`,
      );
    }
    setQuantity(1);
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Pharmacy', href: '/pharmacy' },
          { label: medicine?.name || 'Medicine' },
        ]}
        title={loading ? 'Loading…' : medicine?.name || 'Medicine not found'}
        description={
          medicine
            ? [medicine.genericName, medicine.brandName, medicine.strength].filter(Boolean).join(' · ')
            : 'This preparation is no longer listed in the pharmacy catalogue.'
        }
        actions={
          medicine ? (
            <ButtonLink href="/cart" variant="secondary" size="lg">
              <IconCart className="size-5" />
              View basket
            </ButtonLink>
          ) : null
        }
      />

      <PageBody>
        {loading ? (
          <GridSkeleton count={2} />
        ) : error ? (
          <ErrorState title="We could not load this medicine" description={error.message} onRetry={reload} />
        ) : !medicine ? (
          <Notice tone="warning" title="Not in the catalogue">
            <p>
              This preparation may have been discontinued or delisted.{' '}
              <a href="/pharmacy" className="font-semibold underline">
                Browse the full catalogue
              </a>
              .
            </p>
          </Notice>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
            <div>
              <PageSection>
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
                      <IconPill className="size-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-semibold text-ink">{medicine.name}</h2>
                      <p className="mt-1 text-sm text-muted">{medicine.code}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone={medicine.requiresPrescription ? 'warning' : 'success'} size="sm">
                          {medicine.requiresPrescription ? 'Prescription required' : 'Over the counter'}
                        </Badge>
                        {medicine.form ? (
                          <Badge tone="primary" size="sm">
                            {medicine.form}
                          </Badge>
                        ) : null}
                        {medicine.strength ? (
                          <Badge tone="muted" size="sm">
                            {medicine.strength}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <dl className="mt-6 divide-y divide-line border-t border-line">
                    <DetailRow label="Generic name" value={medicine.genericName} />
                    <DetailRow label="Brand name" value={medicine.brandName} />
                    <DetailRow label="Form" value={medicine.form} />
                    <DetailRow label="Strength" value={medicine.strength} />
                    <DetailRow label="Manufacturer" value={medicine.manufacturer} />
                    <DetailRow label="Sold as" value={medicine.unitOfMeasure} />
                    <DetailRow label="Storage" value={medicine.storageConditions} />
                  </dl>
                </Card>
              </PageSection>

              <PageSection title="Important information">
                <Card className="p-6">
                  {medicine.requiresPrescription ? (
                    <div className="flex gap-3.5 rounded-lg border border-warning-100 bg-warning-50 p-4">
                      <IconLock className="mt-0.5 size-5 shrink-0 text-warning-700" />
                      <div>
                        <p className="text-sm font-semibold text-warning-700">This medicine requires a prescription</p>
                        <p className="mt-1 text-sm leading-relaxed text-warning-700/85">
                          A prescription must have been issued by one of our consultants. Our pharmacist verifies it
                          against your record before dispensing, so please bring or have issued a valid prescription.
                        </p>
                        <ButtonLink href="/prescriptions" variant="secondary" size="sm" className="mt-3">
                          View my prescriptions
                        </ButtonLink>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3.5 rounded-lg border border-success-100 bg-success-50 p-4">
                      <IconCheck className="mt-0.5 size-5 shrink-0 text-success-700" />
                      <div>
                        <p className="text-sm font-semibold text-success-700">Available over the counter</p>
                        <p className="mt-1 text-sm leading-relaxed text-success-700/85">
                          No prescription needed. You can add this to your basket and collect it from the pharmacy
                          counter.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-ink">How to use this medicine safely</h3>
                    <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted">
                      <li className="flex gap-2.5">
                        <IconCheck className="mt-0.5 size-4 shrink-0 text-success-600" />
                        Take it exactly as prescribed, and do not double a dose after a missed one.
                      </li>
                      <li className="flex gap-2.5">
                        <IconCheck className="mt-0.5 size-4 shrink-0 text-success-600" />
                        {medicine.storageConditions
                          ? `Store as instructed: ${medicine.storageConditions.toLowerCase()}.`
                          : 'Store as directed on the pack, away from direct heat and out of reach of children.'}
                      </li>
                      <li className="flex gap-2.5">
                        <IconCheck className="mt-0.5 size-4 shrink-0 text-success-600" />
                        Tell your clinician about any other medicine you take, including herbal preparations.
                      </li>
                      <li className="flex gap-2.5">
                        <IconCheck className="mt-0.5 size-4 shrink-0 text-success-600" />
                        If you react badly to this medicine, stop taking it and seek help immediately.
                      </li>
                    </ul>
                  </div>

                  <Notice tone="muted" className="mt-5">
                    <p>
                      This page shows catalogue information only and is not medical advice. Your consultant or pharmacist
                      will confirm suitability for your particular situation.
                    </p>
                  </Notice>
                </Card>
              </PageSection>
            </div>

            {/* Purchase panel */}
            <aside className="space-y-4">
              <Card className="p-5">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Price</p>
                <p className="mt-1.5 text-3xl font-bold text-ink tabular-nums">{formatCurrency(medicine.unitPrice)}</p>
                <p className="mt-0.5 text-sm text-muted">per {medicine.unitOfMeasure || 'unit'}</p>

                <div className="mt-5">
                  <label htmlFor="quantity" className="text-sm font-medium text-ink">
                    Quantity
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUANTITY_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        id={option === 1 ? 'quantity' : undefined}
                        onClick={() => setQuantity(option)}
                        aria-pressed={quantity === option}
                        className={`h-10 min-w-11 rounded-lg border px-3 text-sm font-medium transition-colors ${
                          quantity === option
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-line bg-white text-ink hover:border-primary-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Subtotal{' '}
                    <span className="font-semibold text-ink tabular-nums">
                      {formatCurrency(Number(medicine.unitPrice) * quantity)}
                    </span>
                  </p>
                </div>

                <Button variant="primary" size="lg" onClick={onAdd} className="mt-5 w-full">
                  <IconCart className="size-5" />
                  {isInCart(medicine.id) ? `Add more (${quantityOf(medicine.id)} in basket)` : 'Add to basket'}
                </Button>
                <ButtonLink href="/checkout" variant="secondary" size="lg" className="mt-2 w-full">
                  Go to checkout
                </ButtonLink>
                {!isAuthenticated ? (
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    You will be asked to sign in before checking out. Your basket is kept on this device.
                  </p>
                ) : null}
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-ink">Stock and collection</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  We do not publish live stock counts. Submit your basket and the pharmacy will confirm availability and
                  collection time before you pay.
                </p>
              </Card>
            </aside>
          </div>
        )}
      </PageBody>

      <CtaStrip
        title="Need advice about this medicine?"
        description="Our pharmacists will answer questions about doses, interactions and side effects."
        primary={
          <ButtonLink href="/messages" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
            Message the pharmacy
          </ButtonLink>
        }
        secondary={
          <ButtonLink href="/pharmacy" variant="outlineDark" size="lg">
            Back to the catalogue
          </ButtonLink>
        }
      />
    </>
  );
}
