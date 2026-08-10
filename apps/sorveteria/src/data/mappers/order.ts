import {
  DeliveryType,
  LegacyPaymentMethod,
  NewOrder,
  Order,
  OrderItem,
  OrderStatusHistoryEntry,
  OrderOrigin,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/types";
import {
  Database,
  DatabaseOrder,
  DatabaseOrderInsert,
  DatabaseOrderItem,
  DatabaseOrderStatusHistory,
  DatabaseOrderItemInsert,
  DatabaseOrderUpdate,
  DatabasePaymentMethod,
  Json,
} from "@/data/supabase/database.types";
import { moneyToDatabase, numericToNumber } from "./numeric";

export type OrderCreateInput = NewOrder & { createdBy?: string };
export type CreateInternalOrderRpcArgs = Database["public"]["Functions"]["create_internal_order"]["Args"];

export function mapOrderFromDatabase(row: DatabaseOrder, items: DatabaseOrderItem[] = []): Order {
  const paymentStatus = row.payment_status as PaymentStatus;
  const orderStatus = row.order_status as OrderStatus;

  return {
    id: row.id,
    publicCode: row.public_code,
    customerName: row.customer_name,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    paymentMethod: mapPaymentMethodFromDatabase(row.payment_method),
    paymentStatus,
    orderStatus,
    status: orderStatus === "canceled" ? "canceled" : paymentStatus === "paid" ? "paid" : "pending_payment",
    origin: row.origin as OrderOrigin,
    deliveryType: row.delivery_type as DeliveryType,
    address: row.address ?? undefined,
    subtotal: numericToNumber(row.subtotal),
    deliveryFee: numericToNumber(row.delivery_fee),
    discount: numericToNumber(row.discount),
    total: numericToNumber(row.total),
    cancellationReason: row.cancellation_reason ?? undefined,
    createdBy: row.created_by ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
    preparingAt: row.preparing_at ?? undefined,
    readyAt: row.ready_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    canceledAt: row.canceled_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map(mapOrderItemFromDatabase),
  };
}

export function mapOrderItemFromDatabase(row: DatabaseOrderItem): OrderItem {
  return {
    id: row.id,
    productId: row.product_id ?? undefined,
    productName: row.product_name,
    category: row.category ?? undefined,
    quantity: row.quantity,
    unitPrice: numericToNumber(row.unit_price),
    subtotal: numericToNumber(row.subtotal),
    details: jsonObjectToRecord(row.details),
    notes: row.notes ?? undefined,
  };
}

export function mapOrderStatusHistoryFromDatabase(row: DatabaseOrderStatusHistory): OrderStatusHistoryEntry {
  return {
    id: row.id,
    orderId: row.order_id,
    previousStatus: row.previous_status as OrderStatus | null ?? undefined,
    newStatus: row.new_status as OrderStatus,
    changedBy: row.changed_by ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapOrderInsertToDatabase(order: OrderCreateInput): DatabaseOrderInsert {
  const subtotal = order.subtotal ?? order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const deliveryFee = order.deliveryFee ?? 0;
  const discount = order.discount ?? 0;

  return {
    customer_name: order.customerName,
    phone: order.phone ?? null,
    notes: order.notes ?? null,
    payment_method: mapPaymentMethodToDatabase(order.paymentMethod),
    payment_status: order.paymentStatus,
    order_status: order.orderStatus,
    origin: order.origin,
    delivery_type: order.deliveryType,
    address: order.address ?? null,
    subtotal: moneyToDatabase(subtotal),
    delivery_fee: moneyToDatabase(deliveryFee),
    discount: moneyToDatabase(discount),
    total: moneyToDatabase(subtotal + deliveryFee - discount),
    cancellation_reason: order.cancellationReason ?? null,
    created_by: order.createdBy ?? null,
    accepted_at: order.acceptedAt ?? null,
    preparing_at: order.preparingAt ?? null,
    ready_at: order.readyAt ?? null,
    completed_at: order.completedAt ?? null,
    canceled_at: order.canceledAt ?? null,
  };
}

export function mapOrderItemInsertToDatabase(orderId: string, item: OrderItem): DatabaseOrderItemInsert {
  const subtotal = item.subtotal ?? item.quantity * item.unitPrice;

  return {
    order_id: orderId,
    product_id: item.productId ?? null,
    product_name: item.productName,
    category: item.category ?? null,
    quantity: item.quantity,
    unit_price: moneyToDatabase(item.unitPrice),
    subtotal: moneyToDatabase(subtotal),
    details: recordToJson(item.details),
    notes: item.notes ?? null,
  };
}

export function mapOrderCreateInputToRpcArgs(order: OrderCreateInput): CreateInternalOrderRpcArgs {
  return {
    p_customer_name: order.customerName,
    p_phone: order.phone ?? null,
    p_notes: order.notes ?? null,
    p_payment_method: mapPaymentMethodToDatabase(order.paymentMethod),
    p_payment_status: order.paymentStatus,
    p_delivery_type: order.deliveryType,
    p_address: order.address ?? null,
    p_delivery_fee: moneyToDatabase(order.deliveryFee ?? 0),
    p_discount: moneyToDatabase(order.discount ?? 0),
    p_items: order.items.map((item) => ({
      product_id: item.productId ?? null,
      product_name: item.productName,
      category: item.category ?? null,
      quantity: item.quantity,
      unit_price: moneyToDatabase(item.unitPrice),
      details: recordToJson(item.details),
      notes: item.notes ?? null,
    })) as Json,
  };
}

export function mapOrderUpdateToDatabase(patch: Partial<Order>): DatabaseOrderUpdate {
  return {
    customer_name: patch.customerName,
    phone: patch.phone,
    notes: patch.notes,
    payment_method: patch.paymentMethod ? mapPaymentMethodToDatabase(patch.paymentMethod) : undefined,
    payment_status: patch.paymentStatus,
    order_status: patch.orderStatus,
    origin: patch.origin,
    delivery_type: patch.deliveryType,
    address: patch.address,
    subtotal: patch.subtotal === undefined ? undefined : moneyToDatabase(patch.subtotal),
    delivery_fee: patch.deliveryFee === undefined ? undefined : moneyToDatabase(patch.deliveryFee),
    discount: patch.discount === undefined ? undefined : moneyToDatabase(patch.discount),
    total: patch.total === undefined ? undefined : moneyToDatabase(patch.total),
    cancellation_reason: patch.cancellationReason,
    created_by: patch.createdBy,
    accepted_at: patch.acceptedAt,
    preparing_at: patch.preparingAt,
    ready_at: patch.readyAt,
    completed_at: patch.completedAt,
    canceled_at: patch.canceledAt,
  };
}

export function mapPaymentMethodToDatabase(method: PaymentMethod | LegacyPaymentMethod): DatabasePaymentMethod {
  return method === "Fiado/Outro" ? "A combinar" : method;
}

export function mapPaymentMethodFromDatabase(method: DatabasePaymentMethod): PaymentMethod {
  return method;
}

function jsonObjectToRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function recordToJson(value: Record<string, unknown> | undefined): Json {
  return (value ?? {}) as Json;
}
