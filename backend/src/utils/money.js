/**
 * Money helpers. All monetary values are stored as DECIMAL(12,2) and every
 * calculation is rounded to 2 decimal places to avoid float drift.
 */

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** subtotal = sum(quantity * unitPrice - discountAmount) + tax */
const lineTotal = ({ quantity, unitPrice, discountAmount = 0, taxRate = 0 }) => {
  const gross = toNumber(quantity) * toNumber(unitPrice);
  const discount = Math.min(toNumber(discountAmount), gross);
  const taxable = gross - discount;
  const tax = taxable * (toNumber(taxRate) / 100);
  return round2(taxable + tax);
};

const lineSubtotal = ({ quantity, unitPrice, discountAmount = 0 }) => {
  const gross = toNumber(quantity) * toNumber(unitPrice);
  return round2(gross - Math.min(toNumber(discountAmount), gross));
};

const lineTax = ({ quantity, unitPrice, discountAmount = 0, taxRate = 0 }) => {
  const tax = lineSubtotal({ quantity, unitPrice, discountAmount }) * (toNumber(taxRate) / 100);
  return round2(tax);
};

const sum = (values) => round2(values.map((v) => toNumber(v)).reduce((acc, v) => acc + v, 0));

/**
 * Authoritative invoice totals. The client never supplies totals.
 * @param {Array<object>} items lines with quantity/unitPrice/discountAmount/taxRate
 * @param {object} options invoice-level discount and insurance coverage
 */
function calculateInvoiceTotals(items, { discountAmount = 0, insuranceAmount = 0 } = {}) {
  const subtotal = sum(items.map((i) => lineSubtotal(i)));
  const taxAmount = sum(items.map((i) => lineTax(i)));
  const grossTotal = round2(subtotal + taxAmount);

  const cappedDiscount = Math.min(Math.max(toNumber(discountAmount), 0), grossTotal);
  const afterDiscount = round2(grossTotal - cappedDiscount);
  const cappedInsurance = Math.min(Math.max(toNumber(insuranceAmount), 0), afterDiscount);
  const totalAmount = round2(afterDiscount - cappedInsurance);

  return {
    subtotal,
    taxAmount,
    discountAmount: round2(cappedDiscount),
    insuranceAmount: round2(cappedInsurance),
    totalAmount,
  };
}

/** Derives invoice + payment status from amounts. */
function deriveInvoiceStatus(totalAmount, amountPaid, currentStatus) {
  const cancelled = currentStatus === 'CANCELLED' || currentStatus === 'DRAFT';
  if (cancelled) return currentStatus;
  const total = toNumber(totalAmount);
  const paid = toNumber(amountPaid);
  if (total <= 0) return 'PAID';
  if (paid >= total) return 'PAID';
  if (paid > 0) return 'PARTIALLY_PAID';
  return 'PENDING';
}

module.exports = {
  round2,
  toNumber,
  lineTotal,
  lineSubtotal,
  lineTax,
  sum,
  calculateInvoiceTotals,
  deriveInvoiceStatus,
};