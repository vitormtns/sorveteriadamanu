"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CartItem, Product, StorefrontSnapshot } from "@/lib/types";

interface StoreContextValue {
  snapshot: StorefrontSnapshot | null;
  loading: boolean;
  error: string;
  cart: CartItem[];
  cartCount: number;
  subtotal: number;
  addProduct: (product: Product, quantity?: number, notes?: string) => void;
  updateCart: (productId: string, quantity: number, notes?: string) => void;
  removeProduct: (productId: string) => void;
  clearCart: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StorefrontSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    fetch("/api/storefront", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success)
          throw new Error(body.error ?? "Falha ao carregar a loja.");
        setSnapshot({
          store: body.store,
          products: body.products,
          settings: body.settings,
        });
      })
      .catch(() =>
        setError("Não foi possível carregar a Esfiharia. Tente novamente."),
      )
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      snapshot,
      loading,
      error,
      cart,
      cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      ),
      addProduct(product, quantity = 1, notes = "") {
        setCart((current) => {
          const existing = current.find(
            (item) => item.product.id === product.id,
          );
          if (existing)
            return current.map((item) =>
              item.product.id === product.id
                ? {
                    ...item,
                    quantity: Math.min(
                      20,
                      item.quantity + Math.max(1, quantity),
                    ),
                    notes: notes || item.notes,
                  }
                : item,
            );
          return [
            ...current,
            { product, quantity: Math.max(1, Math.min(20, quantity)), notes },
          ];
        });
      },
      updateCart(productId, quantity, notes) {
        if (quantity < 1) return;
        setCart((current) =>
          current.map((item) =>
            item.product.id === productId
              ? {
                  ...item,
                  quantity: Math.min(20, quantity),
                  notes: notes ?? item.notes,
                }
              : item,
          ),
        );
      },
      removeProduct(productId) {
        setCart((current) =>
          current.filter((item) => item.product.id !== productId),
        );
      },
      clearCart() {
        setCart([]);
      },
    }),
    [snapshot, loading, error, cart],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value)
    throw new Error("useStore deve ser usado dentro de StoreProvider.");
  return value;
}
