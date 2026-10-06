const money = require('../src/utils/money');

describe('utils/money', () => {
  describe('round2', () => {
    it('rounds to two decimals without float drift', () => {
      expect(money.round2(1.005)).toBe(1.01);
      expect(money.round2(0.1 + 0.2)).toBe(0.3);
      expect(money.round2(10 / 3)).toBe(3.33);
    });
  });

  describe('toNumber', () => {
    it('falls back instead of producing NaN', () => {
      expect(money.toNumber('12.5')).toBe(12.5);
      expect(money.toNumber('abc')).toBe(0);
      expect(money.toNumber('abc', 7)).toBe(7);
    });
  });

  describe('lineSubtotal', () => {
    it('multiplies quantity by unit price', () => {
      expect(money.lineSubtotal({ quantity: 3, unitPrice: 12.5 })).toBe(37.5);
    });

    it('subtracts a discount', () => {
      expect(money.lineSubtotal({ quantity: 2, unitPrice: 10, discountAmount: 5 })).toBe(15);
    });

    it('never discounts below zero', () => {
      expect(money.lineSubtotal({ quantity: 1, unitPrice: 10, discountAmount: 999 })).toBe(0);
    });
  });

  describe('lineTax', () => {
    it('applies the rate to the discounted subtotal', () => {
      expect(money.lineTax({ quantity: 2, unitPrice: 100, taxRate: 7.5 })).toBe(15);
      expect(money.lineTax({ quantity: 2, unitPrice: 100, discountAmount: 50, taxRate: 10 })).toBe(15);
    });
  });

  describe('lineTotal', () => {
    it('adds tax on top of the discounted subtotal', () => {
      expect(money.lineTotal({ quantity: 2, unitPrice: 100, taxRate: 10 })).toBe(220);
      expect(money.lineTotal({ quantity: 2, unitPrice: 100, discountAmount: 50, taxRate: 10 })).toBe(165);
    });
  });

  describe('sum', () => {
    it('totals to two decimals', () => {
      expect(money.sum([0.1, 0.2])).toBe(0.3);
      expect(money.sum([1.005, 2.005])).toBe(3.01);
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('derives totals from the lines and never trusts the client', () => {
      const totals = money.calculateInvoiceTotals([
        { quantity: 2, unitPrice: 100, taxRate: 10 },
        { quantity: 1, unitPrice: 50 },
      ]);

      expect(totals.subtotal).toBe(250);
      expect(totals.taxAmount).toBe(20);
      expect(totals.totalAmount).toBe(270);
      expect(totals.discountAmount).toBe(0);
      expect(totals.insuranceAmount).toBe(0);
    });

    it('caps the invoice discount at the gross total', () => {
      const totals = money.calculateInvoiceTotals([{ quantity: 1, unitPrice: 100 }], {
        discountAmount: 500,
      });

      expect(totals.discountAmount).toBe(100);
      expect(totals.totalAmount).toBe(0);
    });

    it('applies insurance after the discount and caps it at the remainder', () => {
      const totals = money.calculateInvoiceTotals([{ quantity: 1, unitPrice: 100 }], {
        insuranceAmount: 30,
      });

      expect(totals.totalAmount).toBe(70);

      const overCovered = money.calculateInvoiceTotals([{ quantity: 1, unitPrice: 100 }], {
        insuranceAmount: 500,
      });
      expect(overCovered.insuranceAmount).toBe(100);
      expect(overCovered.totalAmount).toBe(0);
    });

    it('returns zeroes for an empty invoice', () => {
      const totals = money.calculateInvoiceTotals([]);

      expect(totals.subtotal).toBe(0);
      expect(totals.taxAmount).toBe(0);
      expect(totals.totalAmount).toBe(0);
    });
  });

  describe('deriveInvoiceStatus', () => {
    it('maps amounts onto statuses', () => {
      expect(money.deriveInvoiceStatus(100, 100)).toBe('PAID');
      expect(money.deriveInvoiceStatus(100, 40)).toBe('PARTIALLY_PAID');
      expect(money.deriveInvoiceStatus(100, 0)).toBe('PENDING');
    });

    it('treats a zero-total invoice as paid', () => {
      expect(money.deriveInvoiceStatus(0, 0)).toBe('PAID');
    });

    it('never rewrites DRAFT or CANCELLED invoices', () => {
      expect(money.deriveInvoiceStatus(100, 100, 'DRAFT')).toBe('DRAFT');
      expect(money.deriveInvoiceStatus(100, 0, 'CANCELLED')).toBe('CANCELLED');
    });
  });
});