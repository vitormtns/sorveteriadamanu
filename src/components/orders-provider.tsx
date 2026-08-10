"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { initialOrders } from "@/lib/mock-data";
import { Order, OrderStatus, OrderStatusHistoryEntry, PaymentStatus } from "@/lib/types";
import { ORDER_REFRESH_DEBOUNCE_MS, shouldRefreshForOrderEvent } from "@/lib/order-sync";
import { useCurrentTime } from "@/hooks/use-current-time";
import { OrderCreateInput } from "@/data/mappers/order";
import { createOrderRepository } from "@/data/repositories/order-repository";
import { RepositoryError, RepositoryResult } from "@/data/repositories/types";
import { createBrowserSupabaseClient } from "@/data/supabase/browser";

type RealtimeStatus = "idle" | "connecting" | "subscribed" | "reconnecting" | "error" | "closed";

interface OrdersContextValue {
  orders: Order[];
  ready: boolean;
  loading: boolean;
  error: string;
  actioningOrderId: string | null;
  currentTime: number;
  realtimeStatus: RealtimeStatus;
  refreshOrders: () => Promise<void>;
  getOrderHistory: (id: string) => Promise<OrderStatusHistoryEntry[]>;
  createOrder: (order: OrderCreateInput) => Promise<Order | null>;
  updateOperationalStatus: (id: string, status: OrderStatus) => Promise<boolean>;
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<boolean>;
  cancelOrder: (id: string, reason: string) => Promise<boolean>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);
const REALTIME_RECONNECT_DELAY_MS = 2_000;

function message(error: RepositoryError): string {
  if (error.code === "P0001" || error.code === "22023") return error.message === "INVALID_STATUS_TRANSITION" ? "Este pedido já foi atualizado em outro dispositivo." : "Não foi possível concluir esta ação para o status atual do pedido.";
  if (error.code === "42501" || error.status === 401 || error.status === 403) return "Sua sessão não permite operar pedidos. Entre novamente.";
  return "Não foi possível atualizar o pedido. Tente novamente.";
}

function logRealtime(status: string, error?: Error) {
  if (process.env.NODE_ENV !== "development") return;
  if (error) {
    console.warn("[OrdersProvider][Realtime]", status, { message: error.message });
    return;
  }
  console.info("[OrdersProvider][Realtime]", status);
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioningOrderId, setActioningOrderId] = useState<string | null>(null);
  const [historyByOrder, setHistoryByOrder] = useState<Record<string, OrderStatusHistoryEntry[]>>({});
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("idle");
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const currentTime = useCurrentTime();
  const latestRefresh = useRef<Promise<void>>(Promise.resolve());
  const refreshVersion = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refreshOrders = useCallback(async () => {
    const requestVersion = ++refreshVersion.current;
    if (!client) {
      if (process.env.NODE_ENV === "development" && mounted.current) setOrders(initialOrders);
      if (mounted.current) setReady(true);
      return;
    }

    if (mounted.current) setLoading(true);
    const run = async () => {
      const result = await createOrderRepository(client).list();
      if (!mounted.current || requestVersion !== refreshVersion.current) return;
      if (result.error) {
        setError(message(result.error));
        return;
      }
      setOrders(result.data);
      setError("");
    };

    latestRefresh.current = latestRefresh.current
      .catch(() => undefined)
      .then(run)
      .finally(() => {
        if (!mounted.current || requestVersion !== refreshVersion.current) return;
        setLoading(false);
        setReady(true);
      });
    await latestRefresh.current;
  }, [client]);

  useEffect(() => {
    if (!client) {
      void Promise.resolve().then(refreshOrders);
      return;
    }

    let channel: ReturnType<typeof client.channel> | null = null;
    let disposed = false;
    let connecting = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const clearRefreshTimer = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = undefined;
      }
    };
    const scheduleRefresh = () => {
      clearRefreshTimer();
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        if (!disposed) void refreshOrders();
      }, ORDER_REFRESH_DEBOUNCE_MS);
    };
    const disconnect = async () => {
      const currentChannel = channel;
      channel = null;
      if (currentChannel) await client.removeChannel(currentChannel);
    };

    const connect = async (): Promise<void> => {
      if (disposed || connecting) return;
      connecting = true;
      setRealtimeStatus((current) => current === "reconnecting" ? current : "connecting");
      logRealtime("CONNECTING");

      try {
        const { data: { session } } = await client.auth.getSession();
        if (disposed) return;
        if (!session) {
          setOrders([]);
          setReady(true);
          setRealtimeStatus("idle");
          return;
        }

        await refreshOrders();
        if (disposed) return;

        const channelName = `orders-operation-${crypto.randomUUID()}`;
        const nextChannel = client
          .channel(channelName)
          .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
            if (disposed || channel !== nextChannel) return;
            if (payload.eventType === "DELETE") {
              const deletedId = typeof payload.old.id === "string" ? payload.old.id : undefined;
              if (deletedId) setOrders((current) => current.filter((order) => order.id !== deletedId));
              return;
            }
            if (shouldRefreshForOrderEvent(payload.eventType)) scheduleRefresh();
          });

        channel = nextChannel;
        nextChannel.subscribe((status, subscriptionError) => {
          if (disposed || channel !== nextChannel) return;
          if (status === "SUBSCRIBED") {
            setRealtimeStatus("subscribed");
            logRealtime("SUBSCRIBED");
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setRealtimeStatus("error");
            logRealtime(status, subscriptionError instanceof Error ? subscriptionError : undefined);
            scheduleReconnect();
            return;
          }

          if (status === "CLOSED") {
            setRealtimeStatus("closed");
            logRealtime("CLOSED");
            scheduleReconnect();
          }
        });
      } catch (connectionError) {
        if (!disposed) {
          setRealtimeStatus("error");
          logRealtime("CHANNEL_ERROR", connectionError instanceof Error ? connectionError : undefined);
          scheduleReconnect();
        }
      } finally {
        connecting = false;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      setRealtimeStatus("reconnecting");
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        if (disposed) return;
        void disconnect().finally(() => { void connect(); });
      }, REALTIME_RECONNECT_DELAY_MS);
    };

    const restartForSession = () => {
      clearRefreshTimer();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      void disconnect().finally(() => { void connect(); });
    };

    void connect();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (disposed) return;
      if (!session) {
        void disconnect();
        setOrders([]);
        setReady(true);
        setRealtimeStatus("idle");
        return;
      }
      restartForSession();
    });

    return () => {
      disposed = true;
      clearRefreshTimer();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      subscription.unsubscribe();
      void disconnect();
    };
  }, [client, refreshOrders]);

  const runAction = useCallback(async (id: string, operation: () => Promise<RepositoryResult<Order>>) => {
    setActioningOrderId(id);
    setError("");
    try {
      const result = await operation();
      if (result.error) {
        setError(message(result.error));
        await refreshOrders();
        return false;
      }
      setOrders((current) => current.map((order) => order.id === id ? result.data : order));
      setHistoryByOrder((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return true;
    } finally {
      setActioningOrderId(null);
    }
  }, [refreshOrders]);

  const getOrderHistory = useCallback(async (id: string) => {
    if (historyByOrder[id]) return historyByOrder[id];
    if (!client) return [];
    const result = await createOrderRepository(client).findHistory(id);
    if (result.error) {
      setError(message(result.error));
      return [];
    }
    setHistoryByOrder((current) => ({ ...current, [id]: result.data }));
    return result.data;
  }, [client, historyByOrder]);

  const value: OrdersContextValue = {
    orders,
    ready,
    loading,
    error,
    actioningOrderId,
    currentTime,
    realtimeStatus,
    refreshOrders,
    getOrderHistory,
    async createOrder(order) {
      if (!client) {
        if (process.env.NODE_ENV !== "development") {
          setError("O Supabase não está configurado neste ambiente.");
          return null;
        }
        const demo: Order = {
          ...order,
          id: `demo-${Date.now()}`,
          publicCode: `DEMO-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subtotal: order.total,
          items: order.items,
        };
        setOrders((current) => [demo, ...current]);
        return demo;
      }

      setActioningOrderId("new");
      try {
        const result = await createOrderRepository(client).create(order);
        if (result.error) {
          setError(message(result.error));
          return null;
        }
        setError("");
        setOrders((current) => [result.data, ...current.filter((existing) => existing.id !== result.data.id)]);
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
