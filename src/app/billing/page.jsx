'use client';

import RequireAuth from '../../components/dashboard/RequireAuth';
import DashboardShell from '../../components/dashboard/DashboardShell';
import { ScopeBar, usePatientScope } from '../../components/dashboard/PatientScope';
import { AsyncView, StatCard, StatGrid } from '../../components/dashboard/primitives';
import { Card, CardBody, CardHeader, DetailRow } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { IconNotes, IconStethoscope, IconWallet } from '../../components/ui/Icon';
import { CardSkeleton, EmptyState, ListSkeleton } from '../../components/ui/States';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  INVOICE_STATUS_META,
  getStatement,
  listInsurancePolicies,
  statementTotals,
} from '../../lib/services/billing';

function Overview({ patientId }) {
  return (
    <AsyncView
      fetcher={() => getStatement(patientId)}
      deps={[patientId]}
      skeleton={<Card><CardSkeleton lines={5} /></Card>}
      isEmpty={(payload) => !payload?.data}
    >
      {(response) => {
        const totals = statementTotals(response.data);
        const invoices = response.data?.invoices || [];
        const payments = response.data?.payments || [];
        return (
          <div className="space-y-6">
            <StatGrid>
              <StatCard label="Total billed" value={formatCurrency(totals.billed, totals.currency)} icon={IconNotes} tone="primary" />
              <StatCard label="Paid" value={formatCurrency(totals.paid, totals.currency)} icon={IconWallet} tone="success" />
              <StatCard
                label="Outstanding"
                value={formatCurrency(totals.outstanding, totals.currency)}
                icon={IconWallet}
                tone={totals.outstanding > 0 ? 'danger' : 'success'}
              />
              <StatCard label="Overdue invoices" value={String(totals.overdueInvoices)} icon={IconNotes} tone="warning" />
            </StatGrid>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader icon={<IconNotes className="size-5" />} title="Invoices" description={`${invoices.length} on file`} />
                <CardBody className="space-y-3">
                  {invoices.length ? (
                    invoices.map((invoice) => (
                      <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">{invoice.invoiceNumber}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {[invoice.issuedAt ? formatDate(invoice.issuedAt, 'short') : null, invoice.dueAt ? `due ${formatDate(invoice.dueAt, 'short')}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold tabular-nums text-ink">
                            {formatCurrency(invoice.total ?? invoice.amount, totals.currency)}
                          </span>
                          <StatusBadge status={invoice.status} meta={INVOICE_STATUS_META} size="sm" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState compact icon={<IconNotes className="size-6" />} title="No invoices" description="Nothing has been billed yet." />
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader icon={<IconWallet className="size-5" />} title="Payments" description={`${payments.length} recorded`} />
                <CardBody className="space-y-3">
                  {payments.length ? (
                    payments.map((payment) => (
                      <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">{payment.reference || payment.invoiceNumber || 'Payment'}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {[payment.method, payment.paidAt || payment.createdAt ? formatDate(payment.paidAt || payment.createdAt, 'short') : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-success-600">
                          {formatCurrency(payment.amount, totals.currency)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState compact icon={<IconWallet className="size-6" />} title="No payments" description="Payments will be listed here once recorded." />
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        );
      }}
    </AsyncView>
  );
}

function PolicyPanel({ patientId }) {
  return (
    <AsyncView
      fetcher={() => listInsurancePolicies({ patientId, limit: 5 })}
      deps={[patientId]}
      skeleton={<ListSkeleton count={2} />}
      empty={<EmptyState compact title="No insurance policies" description="Add a policy at the front desk to start claims." />}
    >
      {(response) => (
        <Card>
          <CardHeader icon={<IconWallet className="size-5" />} title="Insurance" />
          <CardBody className="space-y-3">
            {response.data.map((policy) => (
              <div key={policy.id} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{policy.provider?.name || policy.providerName || 'Policy'}</p>
                  <StatusBadge status={policy.status} size="sm" />
                </div>
                <dl className="mt-2 divide-y divide-line">
                  <DetailRow label="Policy number" value={policy.policyNumber || '—'} />
                  <DetailRow label="Plan" value={policy.planName || '—'} />
                </dl>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </AsyncView>
  );
}

export default function BillingPage() {
  const scope = usePatientScope();

  return (
    <RequireAuth>
      <DashboardShell title="Billing" description="Statements, invoices, payments and cover" wide>
        <div className="space-y-6">
          <ScopeBar scope={scope} />

          {!scope.patientId ? (
            <EmptyState
              icon={<IconStethoscope className="size-7" />}
              title={scope.isPatient ? 'No record linked' : 'Choose a patient first'}
              description={
                scope.isPatient
                  ? 'Your account is not linked to a patient chart yet.'
                  : 'Search for a patient above to see their statement.'
              }
            />
          ) : (
            <>
              <Overview patientId={scope.patientId} />
              <PolicyPanel patientId={scope.patientId} />
            </>
          )}
        </div>
      </DashboardShell>
    </RequireAuth>
  );
}
