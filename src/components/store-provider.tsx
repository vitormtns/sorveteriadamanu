"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { initialOrders, initialProducts } from "@/lib/mock-data";
import { LegacyOrderStatus, NewOrder, Order, Product, StoreSettings } from "@/lib/types";
import { uid } from "@/lib/utils";
import { createPublicOrderCode } from "@/lib/order-code";
import { initialSettings, normalizeSettings } from "@/lib/settings";

interface StoreContextValue {
  products: Product[];
  orders: Order[];
  settings: StoreSettings;
  ready: boolean;
  saveProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
  deleteProduct: (id: string) => void;
  updateSettings: (update: Partial<StoreSettings> | ((current: StoreSettings) => StoreSettings)) => void;
  addOrder: (order: NewOrder) => string;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  refreshOrders: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    availableToday: product.availableToday ?? true,
    featured: product.featured ?? false,
    displayOrder: product.displayOrder ?? 0,
  };
}

function normalizeOrder(order: Partial<Order> & Pick<Order, "id" | "customerName" | "items" | "paymentMethod" | "total" | "createdAt" | "updatedAt">): Order {
  const legacyStatus = order.status as LegacyOrderStatus | undefined;
  const paymentStatus = order.paymentStatus ?? (legacyStatus === "paid" ? "paid" : "pending");
  const orderStatus = order.orderStatus ?? (legacyStatus === "canceled" ? "canceled" : legacyStatus === "paid" ? "delivered" : "new");

  return {
    ...order,
    paymentStatus,
    orderStatus,
    status: orderStatus === "canceled" ? "canceled" : paymentStatus === "paid" ? "paid" : "pending_payment",
    origin: order.origin ?? "internal",
    deliveryType: order.deliveryType ?? "pickup",
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedProducts = localStorage.getItem("manu-products");
    const savedOrders = localStorage.getItem("manu-orders");
    const savedSettings = localStorage.getItem("manu-settings");
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      if (savedProducts) setProducts((JSON.parse(savedProducts) as Product[]).map(normalizeProduct));
      if (savedOrders) setOrders((JSON.parse(savedOrders) as Order[]).map(normalizeOrder));
      if (savedSettings) setSettings(normalizeSettings(JSON.parse(savedSettings)));
    } catch {
      // Mantém os dados iniciais se o armazenamento local estiver corrompido.
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => { if (ready) localStorage.setItem("manu-products", JSON.stringify(products)); }, [products, ready]);
  useEffect(() => { if (ready) localStorage.setItem("manu-orders", JSON.stringify(orders)); }, [orders, ready]);
  useEffect(() => { if (ready) localStorage.setItem("manu-settings", JSON.stringify(settings)); }, [settings, ready]);

  const saveProduct: StoreContextValue["saveProduct"] = (input) => {
    const now = new Date().toISOString();
    if (input.id) {
      setProducts((current) => current.map((item) => item.id === input.id ? { ...item, ...input, updatedAt: now } : item));
      return;
    }
    setProducts((current) => [{ ...input, id: uid(), createdAt: now, updatedAt: now }, ...current]);
  };

  const deleteProduct = (id: string) => setProducts((current) => current.filter((item) => item.id !== id));
  const updateSettings: StoreContextValue["updateSettings"] = (update) =>
    setSettings((current) => normalizeSettings(typeof update === "function" ? update(current) : { ...current, ...update }));

  const refreshOrders = () => {
    try {
      const savedOrders = localStorage.getItem("manu-orders");
      if (savedOrders) setOrders((JSON.parse(savedOrders) as Order[]).map(normalizeOrder));
    } catch {
      // Mantém o estado atual se o armazenamento local estiver corrompido.
    }
  };

  const addOrder = (input: NewOrder) => {
    const id = uid();
    const now = new Date().toISOString();
    setOrders((current) => [normalizeOrder({ ...input, publicCode: input.publicCode ?? createPublicOrderCode(id), id, createdAt: now, updatedAt: now }), ...current]);
    return id;
  };

  const updateOrder = (id: string, patch: Partial<Order>) =>
    setOrders((current) => current.map((order) => {
      if (order.id !== id) return order;
      const translatedPatch = { ...patch };
      if (patch.status && !patch.paymentStatus && !patch.orderStatus) {
        translatedPatch.paymentStatus = patch.status === "paid" ? "paid" : "pending";
        if (patch.status === "canceled") translatedPatch.orderStatus = "canceled";
      }
      return normalizeOrder({ ...order, ...translatedPatch, updatedAt: new Date().toISOString() });
    }));

  return <StoreContext.Provider value={{ products, orders, settings, ready, saveProduct, deleteProduct, updateSettings, addOrder, updateOrder, refreshOrders }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return store;
}
