import { api } from '../api/client';

/**
 * Billing + insurance endpoints.
 *
 * GET /billing/statement/:patientId ->
 *   { patient, billed, paid, outstanding, currency, invoices, payments, claims, overdueInvoices }
 */

export const INVOICE_STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'muted' },
  ISSUED: { label: 'Issued', tone: 'primary' },
  BILLED: { label: 'Billed', tone: 'primary' },
  PARTIALLY_PAID: { label: 'Partially paid', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export const PAYMENT_METHOD_META = {
  CASH: { label: 'Cash' },
  CARD: { label: 'Card' },
  TRANSFER: { label: 'Bank transfer' },
  INSURANCE: { label: 'Insurance' },
};

export async function getStatement(patientId) {
  return api.get(`/billing/statement/${patientId}`);
}

export async function listInvoices(query) {
  return api.get('/billing/', { query });
}

export async function listPayments(query) {
  return api.get('/billing/payments', { query });
}

export async function listInsuranceProviders(query) {
  return api.get('/insurance/providers', { query });
}

export async function listInsurancePolicies(query) {
  return api.get('/insurance/policies', { query });
}

export async function listClaims(query) {
  return api.get('/insurance/claims', { query });
}

export async function listDocuments(query) {
  return api.get('/documents/', { query });
}

/** Turns the statement envelope into the four headline figures the UI shows. */
export function statementTotals(statement) {
  const billed = Number(statement?.billed || 0);
  const paid = Number(statement?.paid || 0);
  const outstanding = Number(statement?.outstanding ?? billed - paid);
  return {
    billed,
    paid,
    outstanding: Math.max(outstanding, 0),
    currency: statement?.currency || 'NGN',
    overdueInvoices: Number(statement?.overdueInvoices || 0),
  };
}