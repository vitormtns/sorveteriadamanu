import { Order, OrderStatus, PaymentStatus } from "@/lib/types";
import {
  mapOrderFromDatabase,
  mapOrderCreateInputToRpcArgs,
  OrderCreateInput,
} from "@/data/mappers/order";
import { DatabaseOrder, DatabaseOrderItem } from "@/data/supabase/database.types";
import { fail, ok, RepositoryClient, RepositoryResult } from "./types";

export interface OrderRepository {
  list(): Promise<RepositoryResult<Order[]>>;
  findById(id: string): Promise<RepositoryResult<Order | null>>;
  findByPublicCode(publicCode: string): Promise<RepositoryResult<Order | null>>;
  create(order: OrderCreateInput): Promise<RepositoryResult<Order>>;
  updateOperationalStatus(id: string, status: OrderStatus, cancellationReason?: string): Promise<RepositoryResult<Order>>;
  updatePaymentStatus(id: string, status: PaymentStatus): Promise<RepositoryResult<Order>>;
}

export function createOrderRepository(client: RepositoryClient): OrderRepository {
  async function mapOrdersWithItems(rows: DatabaseOrder[]): Promise<RepositoryResult<Order[]>> {
    if (!rows.length) return ok([]);

    const orderIds = rows.map((order) => order.id);
    const { data: items, error } = await client
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });

    if (error) return fail(error);

    const itemsByOrderId = new Map<string, DatabaseOrderItem[]>();
    for (const item of items ?? []) {
      const current = itemsByOrderId.get(item.order_id) ?? [];
      current.push(item);
      itemsByOrderId.set(item.order_id, current);
    }

    return ok(rows.map((order) => mapOrderFromDatabase(order, itemsByOrderId.get(order.id) ?? [])));
  }

  async function findBy(column: "id" | "public_code", value: string): Promise<RepositoryResult<Order | null>> {
    const { data, error } = await client
      .from("orders")
      .select("*")
      .eq(column, value)
      .maybeSingle();

    if (error) return fail(error);
    if (!data) return ok(null);

    const mapped = await mapOrdersWithItems([data]);
    if (mapped.error) return mapped;
    return ok(mapped.data[0] ?? null);
  }

  async function reloadOrder(id: string): Promise<RepositoryResult<Order>> {
    const result = await findBy("id", id);
    if (result.error) return result;
    if (!result.data) return fail("Pedido não encontrado.");
    return ok(result.data);
  }

  return {
    async list() {
      const { data, error } = await client
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return fail(error);
      return mapOrdersWithItems(data ?? []);
    },

    async findById(id) {
      return findBy("id", id);
    },

    async findByPublicCode(publicCode) {
      return findBy("public_code", publicCode);
    },

    async create(order) {
      if (order.deliveryType === "delivery" && !order.address?.trim()) {
        return fail("Endereço é obrigatório para entrega.");
      }
      if (!order.items.length) {
        return fail("Pedido deve ter pelo menos um item.");
      }

      const { data: orderId, error } = await client.rpc("create_internal_order", mapOrderCreateInputToRpcArgs(order));

      if (error) return fail(error);
      return reloadOrder(orderId);
    },

    async updateOperationalStatus(id, status, cancellationReason) {
      const { data, error } = await client
        .rpc("update_order_status", {
          p_order_id: id,
          p_new_status: status,
          p_cancellation_reason: cancellationReason ?? null,
        });

      if (error) return fail(error);
      return reloadOrder(data.id);
    },

    async updatePaymentStatus(id, status) {
      const { data, error } = await client.rpc("update_payment_status", {
        p_order_id: id,
        p_payment_status: status,
      });

      if (error) return fail(error);
      return reloadOrder(data.id);
    },
  };
}
