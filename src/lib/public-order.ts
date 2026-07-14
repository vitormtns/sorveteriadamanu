import type { PaymentMethod } from "./types";

export type PublicOrderBuilderType = "acai" | "ice_cream" | "milkshake" | "promotion" | "product";

export interface PublicOrderItemInput {
  builderType: PublicOrderBuilderType;
  quantity: number;
  productId?: string;
  promotionId?: string;
  sizeId?: string;
  formatId?: string;
  scoopId?: string;
  toppingId?: string;
  flavorIds?: string[];
  addOnIds?: string[];
  notes?: string;
}

export interface PublicOrderRequest {
  customerName: string;
  phone: string;
  deliveryType: "pickup" | "delivery";
  address?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: PublicOrderItemInput[];
  idempotencyKey: string;
}

export interface PublicOrderValidationFailure {
  code: "PAYLOAD_INVALID";
  message: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotencyPattern = /^[A-Za-z0-9_-]{16,128}$/;
const paymentMethods: PaymentMethod[] = ["Pix", "Dinheiro", "Cartão", "A combinar"];
const builderTypes: PublicOrderBuilderType[] = ["acai", "ice_cream", "milkshake", "promotion", "product"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredText(value: unknown, field: string, min: number, max: number): string | PublicOrderValidationFailure {
  if (typeof value !== "string") return invalid(`${field} é obrigatório.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) return invalid(`${field} deve ter entre ${min} e ${max} caracteres.`);
  return normalized;
}

function getOptionalText(value: unknown, field: string, max: number): string | undefined | PublicOrderValidationFailure {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return invalid(`${field} é inválido.`);
  const normalized = value.trim();
  if (normalized.length > max) return invalid(`${field} deve ter no máximo ${max} caracteres.`);
  return normalized || undefined;
}

function getOptionalId(value: unknown, field: string): string | undefined | PublicOrderValidationFailure {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !uuidPattern.test(value)) return invalid(`${field} é inválido.`);
  return value;
}

function getIds(value: unknown, field: string): string[] | undefined | PublicOrderValidationFailure {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > 20 || value.some((id) => typeof id !== "string" || !uuidPattern.test(id))) {
    return invalid(`${field} é inválido.`);
  }
  if (new Set(value).size !== value.length) return invalid(`${field} não pode conter itens repetidos.`);
  return value;
}

function invalid(message: string): PublicOrderValidationFailure {
  return { code: "PAYLOAD_INVALID", message };
}

function isFailure(value: unknown): value is PublicOrderValidationFailure {
  return isRecord(value) && value.code === "PAYLOAD_INVALID";
}

export function parsePublicOrderRequest(value: unknown): PublicOrderRequest | PublicOrderValidationFailure {
  if (!isRecord(value)) return invalid("O pedido enviado é inválido.");
  const customerName = getRequiredText(value.customerName, "Nome", 2, 100);
  const rawPhone = typeof value.phone === "string" ? value.phone.replace(/\D/g, "") : "";
  const address = getOptionalText(value.address, "Endereço", 500);
  const notes = getOptionalText(value.notes, "Observação", 500);
  const idempotencyKey = value.idempotencyKey;
  if (isFailure(customerName)) return customerName;
  if (isFailure(address)) return address;
  if (isFailure(notes)) return notes;
  if (rawPhone.length < 10 || rawPhone.length > 11) return invalid("Telefone deve ter DDD e número.");
  if (value.deliveryType !== "pickup" && value.deliveryType !== "delivery") return invalid("Tipo de entrega inválido.");
  if (value.deliveryType === "delivery" && !address) return invalid("Endereço é obrigatório para entrega.");
  if (!paymentMethods.includes(value.paymentMethod as PaymentMethod)) return invalid("Forma de pagamento inválida.");
  if (typeof idempotencyKey !== "string" || !idempotencyPattern.test(idempotencyKey)) return invalid("Chave de envio inválida.");
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 30) return invalid("Adicione entre 1 e 30 itens ao pedido.");

  const items: PublicOrderItemInput[] = [];
  for (const rawItem of value.items) {
    if (!isRecord(rawItem) || !builderTypes.includes(rawItem.builderType as PublicOrderBuilderType)) return invalid("Item do pedido inválido.");
    if (!Number.isInteger(rawItem.quantity) || (rawItem.quantity as number) < 1 || (rawItem.quantity as number) > 20) return invalid("Quantidade do item inválida.");
    const productId = getOptionalId(rawItem.productId, "Produto");
    const promotionId = getOptionalId(rawItem.promotionId, "Promoção");
    const sizeId = getOptionalId(rawItem.sizeId, "Tamanho");
    const formatId = getOptionalId(rawItem.formatId, "Recipiente");
    const scoopId = getOptionalId(rawItem.scoopId, "Quantidade de bolas");
    const toppingId = getOptionalId(rawItem.toppingId, "Cobertura");
    const flavorIds = getIds(rawItem.flavorIds, "Sabores");
    const addOnIds = getIds(rawItem.addOnIds, "Adicionais");
    const itemNotes = getOptionalText(rawItem.notes, "Observação do item", 300);
    if (isFailure(productId)) return productId;
    if (isFailure(promotionId)) return promotionId;
    if (isFailure(sizeId)) return sizeId;
    if (isFailure(formatId)) return formatId;
    if (isFailure(scoopId)) return scoopId;
    if (isFailure(toppingId)) return toppingId;
    if (isFailure(flavorIds)) return flavorIds;
    if (isFailure(addOnIds)) return addOnIds;
    if (isFailure(itemNotes)) return itemNotes;

    const builderType = rawItem.builderType as PublicOrderBuilderType;
    if ((builderType === "acai" && !sizeId)
      || (builderType === "ice_cream" && (!formatId || !scoopId || !toppingId || !flavorIds))
      || (builderType === "milkshake" && (!sizeId || !flavorIds))
      || (builderType === "promotion" && !promotionId)
      || (builderType === "product" && !productId)) return invalid("Item do pedido está incompleto.");

    items.push({
      builderType,
      quantity: rawItem.quantity as number,
      productId,
      promotionId,
      sizeId,
      formatId,
      scoopId,
      toppingId,
      flavorIds,
      addOnIds,
      notes: itemNotes,
    });
  }

  return { customerName, phone: rawPhone, deliveryType: value.deliveryType, address, paymentMethod: value.paymentMethod as PaymentMethod, notes, items, idempotencyKey };
}

export function toPublicOrderRpcPayload(request: PublicOrderRequest) {
  return {
    customer_name: request.customerName,
    phone: request.phone,
    delivery_type: request.deliveryType,
    address: request.address ?? null,
    payment_method: request.paymentMethod,
    notes: request.notes ?? null,
    items: request.items.map((item) => ({
      builder_type: item.builderType,
      quantity: item.quantity,
      product_id: item.productId ?? null,
      promotion_id: item.promotionId ?? null,
      size_id: item.sizeId ?? null,
      format_id: item.formatId ?? null,
      scoop_id: item.scoopId ?? null,
      topping_id: item.toppingId ?? null,
      flavor_ids: item.flavorIds ?? [],
      add_on_ids: item.addOnIds ?? [],
      notes: item.notes ?? null,
    })),
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateAcaiAddOnPrice(prices: number[], freeQuantity: number): number {
  const paid = prices.slice(Math.max(0, freeQuantity));
  return roundMoney(paid.reduce((total, price) => total + price, 0));
}

export function isWithinBusinessHours(open: string, close: string, currentMinutes: number, previousDay = false): boolean {
  const [openHour, openMinute] = open.split(":").map(Number);
  const [closeHour, closeMinute] = close.split(":").map(Number);
  const start = openHour * 60 + openMinute;
  const end = closeHour * 60 + closeMinute;
  return end >= start
    ? !previousDay && currentMinutes >= start && currentMinutes <= end
    : previousDay ? currentMinutes <= end : currentMinutes >= start;
}

export function canMeetMinimumOrder(subtotal: number, minimumOrder: number, deliveryType: "pickup" | "delivery"): boolean {
  return deliveryType === "pickup" || roundMoney(subtotal) >= roundMoney(minimumOrder);
}

export function publicOrderError(status: number, code?: string): { status: number; code: string; message: string } {
  const messages: Record<string, string> = {
    STORE_CLOSED: "A loja está fechada no momento.",
    STORE_PAUSED: "Os pedidos online estão pausados no momento.",
    PICKUP_DISABLED: "A retirada não está disponível no momento.",
    DELIVERY_DISABLED: "A entrega não está disponível no momento.",
    PAYMENT_METHOD_UNAVAILABLE: "A forma de pagamento escolhida não está disponível.",
    MINIMUM_ORDER_NOT_REACHED: "O pedido não atingiu o valor mínimo para entrega.",
    PRODUCT_UNAVAILABLE: "Um produto do pedido não está disponível.",
    PROMOTION_UNAVAILABLE: "Uma promoção do pedido não está disponível.",
    FLAVOR_UNAVAILABLE: "Um sabor do pedido não está disponível.",
    ADD_ON_UNAVAILABLE: "Um adicional do pedido não está disponível.",
    BUILDER_OPTION_UNAVAILABLE: "Uma opção de montagem não está disponível.",
    IDEMPOTENCY_CONFLICT: "Este envio já foi usado para um pedido diferente.",
    PAYLOAD_INVALID: "Revise os dados do pedido antes de enviar.",
    ITEMS_INVALID: "Revise os itens do pedido antes de enviar.",
    FLAVORS_INVALID: "Revise os sabores escolhidos.",
    ADDRESS_REQUIRED: "Informe o endereço para entrega.",
  };
  const resolvedCode = code && messages[code] ? code : "ORDER_CREATION_FAILED";
  return { status, code: resolvedCode, message: messages[resolvedCode] ?? "Não foi possível enviar o pedido." };
}
