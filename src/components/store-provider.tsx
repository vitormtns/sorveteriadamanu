"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { initialOrders, initialProducts } from "@/lib/mock-data";
import { NewOrder, Order, Product } from "@/lib/types";
import { uid } from "@/lib/utils";

interface StoreContextValue {
  products: Product[];
  orders: Order[];
  ready: boolean;
  saveProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
  deleteProduct: (id: string) => void;
  addOrder: (order: NewOrder) => string;
  updateOrder: (id: string, patch: Partial<Order>) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedProducts = localStorage.getItem("manu-products");
    const savedOrders = localStorage.getItem("manu-orders");
    /* eslint-disable react-hooks/set-state-in-effect */
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => { if (ready) localStorage.setItem("manu-products", JSON.stringify(products)); }, [products, ready]);
  useEffect(() => { if (ready) localStorage.setItem("manu-orders", JSON.stringify(orders)); }, [orders, ready]);

  const saveProduct: StoreContextValue["saveProduct"] = (input) => {
    const now = new Date().toISOString();
    if (input.id) {
      setProducts((current) => current.map((item) => item.id === input.id ? { ...item, ...input, updatedAt: now } : item));
      return;
    }
    setProducts((current) => [{ ...input, id: uid(), createdAt: now, updatedAt: now }, ...current]);
  };

  const deleteProduct = (id: string) => setProducts((current) => current.filter((item) => item.id !== id));

  const addOrder = (input: NewOrder) => {
    const id = uid();
    const now = new Date().toISOString();
    setOrders((current) => [{ ...input, id, createdAt: now, updatedAt: now }, ...current]);
    return id;
  };

  const updateOrder = (id: string, patch: Partial<Order>) =>
    setOrders((current) => current.map((order) => order.id === id ? { ...order, ...patch, updatedAt: new Date().toISOString() } : order));

  return <StoreContext.Provider value={{ products, orders, ready, saveProduct, deleteProduct, addOrder, updateOrder }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return store;
}
