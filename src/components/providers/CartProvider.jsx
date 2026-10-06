'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';

/**
 * Pharmacy basket.
 *
 * Persisted client-side in localStorage. There is no cart/order table in the
 * backend, so nothing here pretends to be a server-side order - see
 * docs/FRONTEND.md, where the missing `POST /pharmacy/orders` endpoint is
 * recorded as a required contract.
 */

const CART_KEY = 'sa.cart.v1';
const MAX_QTY = 20;

const CartContext = createContext(null);

function readStoredCart() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((line) => line?.id && Number.isFinite(Number(line.quantity))) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [lines, setLines] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable - basket simply does not persist */
    }
  }, [lines, hydrated]);

  const addItem = useCallback(
    (medication, quantity = 1) => {
      if (!medication) return;
      if (!isAuthenticated) {
        // Browsing the catalogue needs a session, so prompt before adding.
        openAuthModal({ intent: 'cart', message: 'Sign in to fill your pharmacy basket.' });
        setLines((current) => {
          const existing = current.find((line) => line.id === medication.id);
          if (existing) return current;
          return [...current, { ...toLine(medication), quantity: 1 }];
        });
        return;
      }
      setLines((current) => {
        const existing = current.find((line) => line.id === medication.id);
        if (existing) {
          return current.map((line) =>
            line.id === medication.id ? { ...line, quantity: Math.min(MAX_QTY, line.quantity + quantity) } : line,
          );
        }
        return [...current, { ...toLine(medication), quantity: Math.min(MAX_QTY, quantity) }];
      });
    },
    [isAuthenticated, openAuthModal],
  );

  const setQuantity = useCallback((id, quantity) => {
    setLines((current) =>
      current
        .map((line) =>
          line.id === id ? { ...line, quantity: Math.max(0, Math.min(MAX_QTY, Number(quantity) || 0)) } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((id) => {
    setLines((current) => current.filter((line) => line.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const summary = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const requiresPrescription = lines.some((line) => line.requiresPrescription);
    return {
      count,
      subtotal,
      requiresPrescription,
      // The backend models no delivery fee or tax for retail medicines.
      deliveryFee: 0,
      total: subtotal,
    };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      count: summary.count,
      subtotal: summary.subtotal,
      total: summary.total,
      requiresPrescription: summary.requiresPrescription,
      hydrated,
      addItem,
      setQuantity,
      removeItem,
      clear,
      isInCart: (id) => lines.some((line) => line.id === id),
      quantityOf: (id) => lines.find((line) => line.id === id)?.quantity || 0,
    }),
    [lines, summary, hydrated, addItem, setQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function toLine(medication) {
  return {
    id: medication.id,
    code: medication.code,
    name: medication.name,
    genericName: medication.genericName,
    brandName: medication.brandName,
    form: medication.form,
    strength: medication.strength,
    unitPrice: Number(medication.unitPrice) || 0,
    requiresPrescription: Boolean(medication.requiresPrescription),
  };
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}

export default CartContext;