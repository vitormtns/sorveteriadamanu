"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { initialOrders } from "@/lib/mock-data";
import { Order, OrderStatus, OrderStatusHistoryEntry, PaymentStatus } from "@/lib/types";
import { OrderCreateInput } from "@/data/mappers/order";
import { createOrderRepository } from "@/data/repositories/order-repository";
import { RepositoryError, RepositoryResult } from "@/data/repositories/types";
import { createBrowserSupabaseClient } from "@/data/supabase/browser";

interface OrdersContextValue {
  orders: Order[];
  ready: boolean;
  loading: boolean;
  error: string;
  actioningOrderId: string | null;
  refreshOrders: () => Promise<void>;
  getOrderHistory: (id: string) => Promise<OrderStatusHistoryEntry[]>;
  createOrder: (order: OrderCreateInput) => Promise<Order | null>;
  updateOperationalStatus: (id: string, status: OrderStatus) => Promise<boolean>;
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<boolean>;
  cancelOrder: (id: string, reason: string) => Promise<boolean>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

function message(error: RepositoryError): string {
  if (error.code === "P0001" || error.code === "22023") return error.message === "INVALID_STATUS_TRANSITION" ? "Este pedido já foi atualizado em outro dispositivo." : "Não foi possível concluir esta ação para o status atual do pedido.";
  if (error.code === "42501" || error.status === 401 || error.status === 403) return "Sua sessão não permite operar pedidos. Entre novamente.";
  return "Não foi possível atualizar o pedido. Tente novamente.";
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioningOrderId, setActioningOrderId] = useState<string | null>(null);
  const [historyByOrder, setHistoryByOrder] = useState<Record<string, OrderStatusHistoryEntry[]>>({});
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const latestRefresh = useRef<Promise<void>>(Promise.resolve());
  const realtimeChannelName = useRef(`orders-operation-${crypto.randomUUID()}`);

  const refreshOrders = useCallback(async () => {
    if (!client) {
      if (process.env.NODE_ENV === "development") setOrders(initialOrders);
      setReady(true);
      return;
    }
    setLoading(true);
    const run = async () => {
      const result = await createOrderRepository(client).list();
      if (result.error) { setError(message(result.error)); return; }
      setOrders(result.data);
      setError("");
    };
    latestRefresh.current = latestRefresh.current.catch(() => undefined).then(run).finally(() => setLoading(false));
    await latestRefresh.current;
    setReady(true);
  }, [client]);

  useEffect(() => {
    if (!client) { void Promise.resolve().then(refreshOrders); return; }
    let channel: ReturnType<typeof client.channel> | null = null;
    void (async () => {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { setOrders([]); setReady(true); return; }
      await refreshOrders();
      channel = client.channel(realtimeChannelName.current).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { void refreshOrders(); }).on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => { void refreshOrders(); }).subscribe();
    })();
    return () => { if (channel) void client.removeChannel(channel); };
  }, [client, refreshOrders]);

  const runAction = useCallback(async (id: string, operation: () => Promise<RepositoryResult<Order>>) => {
    setActioningOrderId(id); setError("");
    try {
      const result = await operation();
      if (result.error) { setError(message(result.error)); await refreshOrders(); return false; }
      setOrders((current) => current.map((order) => order.id === id ? result.data : order));
      setHistoryByOrder((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return true;
    } finally { setActioningOrderId(null); }
  }, [refreshOrders]);

  const getOrderHistory = useCallback(async (id: string) => {
    if (historyByOrder[id]) return historyByOrder[id];
    if (!client) return [];
    const result = await createOrderRepository(client).findHistory(id);
    if (result.error) { setError(message(result.error)); return []; }
    setHistoryByOrder((current) => ({ ...current, [id]: result.data }));
    return result.data;
  }, [client, historyByOrder]);

  const value: OrdersContextValue = {
    orders, ready, loading, error, actioningOrderId, refreshOrders, getOrderHistory,
    async createOrder(order) {
      if (!client) {
        if (process.env.NODE_ENV !== "development") { setError("O Supabase não está configurado neste ambiente."); return null; }
        const demo: Order = { ...order, id: `demo-${Date.now()}`, publicCode: `DEMO-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), subtotal: order.total, items: order.items };
        setOrders((current) => [demo, ...current]); return demo;
      }
      setActioningOrderId("new");
      try {
        const result = await createOrderRepository(client).create(order);
        if (result.error) { setError(message(result.error)); return null; }
        setError("");
        setOrders((current) => [result.data, ...current]);
        return result.data;
      } finally {
        setActioningOrderId(null);
      }
    },
    updateOperationalStatus: (id, status) => client ? runAction(id, () => createOrderRepository(client).updateOperationalStatus(id, status)) : Promise.resolve(false),
    updatePaymentStatus: (id, status) => client ? runAction(id, () => createOrderRepository(client).updatePaymentStatus(id, status)) : Promise.resolve(false),
    cancelOrder: (id, reason) => client ? runAction(id, () => createOrderRepository(client).cancel(id, reason)) : Promise.resolve(false),
  };
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const value = useContext(OrdersContext);
  if (!value) throw new Error("useOrders deve ser usado dentro de OrdersProvider");
  return value;
}
