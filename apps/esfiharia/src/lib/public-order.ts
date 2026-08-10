import type { DeliveryType, PaymentMethod, StorefrontSnapshot } from "./types";

export interface SimpleOrderInput {
  customerName: string;
  phone: string;
  deliveryType: DeliveryType;
  address?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  idempotencyKey: string;
  trackingToken: string;
  items: { productId: string; quantity: number; notes?: string }[];
}

export type ValidationResult =
  | { data: SimpleOrderInput; error: null }
  | { data: null; error: string };
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const payments: PaymentMethod[] = ["Pix", "Dinheiro", "Cartão", "A combinar"];

export function parseSimpleOrder(value: unknown): ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return failure("O pedido enviado é inválido.");
  const body = value as Record<string, unknown>;
  const customerName = text(body.customerName, 2, 100);
  const phone =
    typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  const deliveryType = body.deliveryType;
  const paymentMethod = body.paymentMethod;
  const address = optionalText(body.address, 500);
  const notes = optionalText(body.notes, 500);
  if (!customerName || !/^\d{10,11}$/.test(phone))
    return failure("Informe nome e telefone válidos.");
  if (deliveryType !== "pickup" && deliveryType !== "delivery")
    return failure("Escolha retirada ou entrega.");
  if (deliveryType === "delivery" && !address)
    return failure("Endereço é obrigatório para entrega.");
  if (
    typeof paymentMethod !== "string" ||
    !payments.includes(paymentMethod as PaymentMethod)
  )
    return failure("Forma de pagamento inválida.");
  if (
    typeof body.idempotencyKey !== "string" ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(body.idempotencyKey)
  )
    return failure("Identificador do pedido inválido.");
  if (
    typeof body.trackingToken !== "string" ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(body.trackingToken)
  )
    return failure("Token de acompanhamento inválido.");
  if (
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > 30
  )
    return failure("Adicione ao menos um produto.");
  const items: SimpleOrderInput["items"] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      return failure("Item inválido.");
    const item = raw as Record<string, unknown>;
    if (
      typeof item.productId !== "string" ||
      !uuid.test(item.productId) ||
      !Number.isInteger(item.quantity) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > 20
    )
      return failure("Produto ou quantidade inválida.");
    items.push({
      productId: item.productId,
      quantity: Number(item.quantity),
      notes: optionalText(item.notes, 300),
    });
  }
  return {
    data: {
      customerName,
      phone,
      deliveryType,
      address,
      paymentMethod: paymentMethod as PaymentMethod,
      notes,
      items,
      idempotencyKey: body.idempotencyKey,
      trackingToken: body.trackingToken,
    },
    error: null,
  };
}

export function toRpcPayload(order: SimpleOrderInput) {
  return {
    customer_name: order.customerName,
    phone: order.phone,
    delivery_type: order.deliveryType,
    address: order.address,
    payment_method: order.paymentMethod,
    notes: order.notes,
    items: order.items.map((item) => ({
      builder_type: "product",
      product_id: item.productId,
      quantity: item.quantity,
      notes: item.notes,
    })),
  };
}

export function canAcceptOrders(snapshot: StorefrontSnapshot | null): boolean {
  return Boolean(
    snapshot?.store.active &&
      snapshot.settings?.deliveryOpen &&
      !snapshot.settings.paused &&
      !snapshot.settings.closedToday,
  );
}

function text(value: unknown, min: number, max: number) {
  return typeof value === "string" &&
    value.trim().length >= min &&
    value.trim().length <= max
    ? value.trim()
    : "";
}
function optionalText(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length <= max
    ? value.trim() || undefined
    : undefined;
}
function failure(error: string): ValidationResult {
  return { data: null, error };
}
