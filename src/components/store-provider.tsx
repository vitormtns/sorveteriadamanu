"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { initialOrders, initialProducts } from "@/lib/mock-data";
import { LegacyOrderStatus, LegacyPaymentMethod, NewOrder, Order, PaymentMethod, Product, StoreSettings } from "@/lib/types";
import { uid } from "@/lib/utils";
import { createPublicOrderCode } from "@/lib/order-code";
import { initialSettings, normalizeSettings } from "@/lib/settings";

interface StoreContextValue {
  products: Product[];
  orders: Order[];
  settings: StoreSettings;
  settingsSaveError: boolean;
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
  const rawPaymentMethod = order.paymentMethod as PaymentMethod | LegacyPaymentMethod;
  const paymentMethod = rawPaymentMethod === "Fiado/Outro" ? "A combinar" : rawPaymentMethod;

  return {
    ...order,
    paymentMethod,
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
  const [settingsSaveError, setSettingsSaveError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const savedProducts = localStorage.getItem("manu-products");
      if (savedProducts) setProducts((JSON.parse(savedProducts) as Product[]).map(normalizeProduct));
    } catch { /* Mantém os produtos iniciais se estes dados estiverem corrompidos. */ }
    try {
      const savedOrders = localStorage.getItem("manu-orders");
      if (savedOrders) setOrders((JSON.parse(savedOrders) as Order[]).map(normalizeOrder));
    } catch { /* Mantém os pedidos iniciais se estes dados estiverem corrompidos. */ }
    try {
      const savedSettings = localStorage.getItem("manu-settings");
      if (savedSettings) setSettings(normalizeSettings(JSON.parse(savedSettings)));
    } catch { /* Mantém as configurações iniciais se estes dados estiverem corrompidos. */ }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    const syncStorage = (event: StorageEvent) => {
      try {
        if (event.key === "manu-products" && event.newValue) {
          setProducts((JSON.parse(event.newValue) as Product[]).map(normalizeProduct));
        }
        if (event.key === "manu-orders" && event.newValue) {
          setOrders((JSON.parse(event.newValue) as Order[]).map(normalizeOrder));
        }
        if (event.key === "manu-settings" && event.newValue) {
          setSettings(normalizeSettings(JSON.parse(event.newValue)));
        }
      } catch {
        // Ignora apenas a atualização externa inválida e preserva o estado atual.
      }
    };
    window.addEventListener("storage", syncStorage);
    return () => window.removeEventListener("storage", syncStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("manu-products", JSON.stringify(products)); } catch { /* Preserva o estado em memória. */ }
  }, [products, ready]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("manu-orders", JSON.stringify(orders)); } catch { /* Preserva o estado em memória. */ }
  }, [orders, ready]);
  useEffect(() => {
    if (!ready) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      localStorage.setItem("manu-settings", JSON.stringify(settings));
      setSettingsSaveError(false);
    } catch {
      setSettingsSaveError(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [settings, ready]);

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

  return <StoreContext.Provider value={{ products, orders, settings, settingsSaveError, ready, saveProduct, deleteProduct, updateSettings, addOrder, updateOrder, refreshOrders }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return store;
}
