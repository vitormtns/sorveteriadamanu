"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { realtimeStoreFilter } from "@/lib/store-config";
import { Order, OrderItem, OrderStatus, PaymentStatus } from "@/lib/types";
import { useStore } from "./store-provider";

interface OrdersContextValue {
  orders: Order[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  updateStatus: (id: string, status: OrderStatus) => Promise<void>;
  updatePayment: (id: string, status: PaymentStatus) => Promise<void>;
  cancel: (id: string) => Promise<void>;
}
const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { snapshot } = useStore();
  const path = usePathname();
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const internal = ["/sistema", "/pedidos", "/produtos", "/configuracoes"].some(
    (prefix) => path.startsWith(prefix),
  );
  const refresh = useCallback(async () => {
    if (!client || !snapshot?.store.active || !internal) return;
    setLoading(true);
    const { data, error: orderError } = await client
      .from("orders")
      .select("*")
      .eq("store_id", snapshot.store.id)
      .order("created_at", { ascending: false })
      .limit(120);
    if (orderError) {
      setError("Não foi possível carregar os pedidos.");
      setLoading(false);
      return;
    }
    const ids = (data ?? []).map((row) => row.id);
    const itemsResult = ids.length
      ? await client
          .from("order_items")
          .select("*")
          .in("order_id", ids)
          .order("created_at")
      : { data: [], error: null };
    if (itemsResult.error) {
      setError("Não foi possível carregar os itens.");
      setLoading(false);
      return;
    }
    const byOrder = new Map<string, OrderItem[]>();
    for (const row of itemsResult.data ?? []) {
      const list = byOrder.get(row.order_id) ?? [];
      list.push({
        id: row.id,
        productName: row.product_name,
        quantity: row.quantity,
        unitPrice: Number(row.unit_price),
        subtotal: Number(row.subtotal),
        notes: row.notes ?? undefined,
      });
      byOrder.set(row.order_id, list);
    }
    setOrders(
      (data ?? []).map((row) => ({
        id: row.id,
        publicCode: row.public_code,
        customerName: row.customer_name,
        phone: row.phone ?? undefined,
        notes: row.notes ?? undefined,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        orderStatus: row.order_status,
        deliveryType: row.delivery_type,
        address: row.address ?? undefined,
        subtotal: Number(row.subtotal),
        deliveryFee: Number(row.delivery_fee),
        discount: Number(row.discount),
        total: Number(row.total),
        createdAt: row.created_at,
        items: byOrder.get(row.id) ?? [],
      })),
    );
    setError("");
    setLoading(false);
  }, [client, snapshot, internal]);
  useEffect(() => {
    queueMicrotask(() => void refresh());
    if (!client || !snapshot?.store.active || !internal) return;
    const channel = client
      .channel(`esfiharia-orders-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: realtimeStoreFilter(snapshot.store.id),
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: realtimeStoreFilter(snapshot.store.id),
        },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [client, snapshot, internal, refresh]);
  async function rpc(name: string, args: Record<string, unknown>) {
    if (!client || !snapshot) return;
    const { error } = await client.rpc(name, args);
    if (error) setError("Não foi possível atualizar o pedido.");
    else await refresh();
  }
  return (
    <OrdersContext.Provider
      value={{
        orders,
        loading,
        error,
        refresh,
        updateStatus: (id, status) =>
          rpc("update_order_status", {
            p_store_id: snapshot!.store.id,
            p_order_id: id,
            p_new_status: status,
            p_cancellation_reason: null,
          }),
        updatePayment: (id, status) =>
          rpc("update_payment_status", {
            p_store_id: snapshot!.store.id,
            p_order_id: id,
            p_payment_status: status,
          }),
        cancel: (id) =>
          rpc("cancel_order", {
            p_store_id: snapshot!.store.id,
            p_order_id: id,
            p_cancellation_reason: "Cancelado pela operação.",
          }),
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}
export function useOrders() {
  const value = useContext(OrdersContext);
  if (!value)
    throw new Error("useOrders deve ser usado dentro de OrdersProvider.");
  return value;
}
