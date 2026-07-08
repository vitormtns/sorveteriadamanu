import { Order, OrderStatus } from "./types";

export type OrderQueueContext = "default" | "prepare" | "deliver" | "collect";

export interface OrderIssue {
  label: string;
  tone: "warning" | "danger";
}

export interface OrderChecklistItem {
  label: string;
  ok: boolean;
  tone?: "success" | "warning" | "neutral";
}

const hasText = (value?: string) => Boolean(value?.trim());

export function splitOrderItemName(productName: string) {
  const parts = productName
    .split(/\s(?:—|-|·)\s/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    title: parts[0] || productName,
    details: parts.slice(1),
  };
}

export function getOrderAgeLabel(order: Order) {
  const createdAt = new Date(order.createdAt);
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000));
  const arrivedAt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(createdAt);

  if (order.orderStatus === "ready") {
    if (minutes < 60) return `Pronto há ${minutes || 1} min`;
    return `Pronto há ${Math.floor(minutes / 60)} h`;
  }

  if (minutes < 60) return `Aguardando há ${minutes || 1} min`;
  return `Chegou às ${arrivedAt}`;
}

export function getOperationalTaskLabel(order: Order, context: OrderQueueContext) {
  if (order.orderStatus === "canceled") return "Pedido cancelado";
  if (context === "collect") return order.paymentStatus === "pending" ? "Cobrar pagamento" : "Pagamento recebido";
  if (context === "deliver") return order.deliveryType === "delivery" ? "Entregar pedido" : "Separar retirada";
  if (context === "prepare") return order.orderStatus === "new" ? "Novo pedido" : "Em preparo";

  const labels: Record<OrderStatus, string> = {
    new: "Preparar",
    preparing: "Finalizar preparo",
    ready: order.deliveryType === "delivery" ? "Entregar" : "Retirada",
    delivered: "Concluído",
    canceled: "Cancelado",
  };
  return labels[order.orderStatus];
}

export function getOrderIssues(order: Order): OrderIssue[] {
  const issues: OrderIssue[] = [];
  const hasItems = order.items.length > 0;
  const hasInvalidItem = order.items.some((item) => !hasText(item.productName) || item.quantity <= 0 || item.unitPrice < 0);

  if (!hasText(order.customerName)) issues.push({ label: "Falta cliente", tone: "danger" });
  if (!hasItems) issues.push({ label: "Pedido sem itens", tone: "danger" });
  if (hasInvalidItem) issues.push({ label: "Informação incompleta", tone: "warning" });
  if (!order.total || order.total <= 0) issues.push({ label: "Verificar total", tone: "warning" });
  if (!order.paymentMethod) issues.push({ label: "Sem forma de pagamento", tone: "warning" });
  if (!order.paymentStatus || !order.orderStatus || !order.origin) issues.push({ label: "Informação incompleta", tone: "warning" });

  if (order.deliveryType === "delivery") {
    if (!hasText(order.address)) issues.push({ label: "Falta endereço", tone: "danger" });
    if (!hasText(order.phone)) issues.push({ label: "Falta telefone", tone: "danger" });
    if (order.deliveryFee === undefined || order.deliveryFee === null) issues.push({ label: "Falta taxa de entrega", tone: "warning" });
  }

  if (order.deliveryType === "pickup" && order.origin === "delivery" && !hasText(order.phone)) {
    issues.push({ label: "Falta telefone", tone: "warning" });
  }

  if (hasText(order.notes) && /confirmar|verificar|d[uú]vida|\?/i.test(order.notes || "")) {
    issues.push({ label: "Verificar observação", tone: "warning" });
  }

  return issues;
}

export function getOrderChecklist(order: Order): OrderChecklistItem[] {
  const items: OrderChecklistItem[] = [
    {
      label: order.items.length ? "Itens ok" : "Sem itens",
      ok: order.items.length > 0,
      tone: order.items.length ? "success" : "warning",
    },
    {
      label: order.paymentStatus === "paid" ? "Pagamento pago" : "Pagamento pendente",
      ok: order.paymentStatus === "paid",
      tone: order.paymentStatus === "paid" ? "success" : "warning",
    },
    {
      label: order.notes?.trim() ? "Tem observação" : "Sem observação",
      ok: true,
      tone: order.notes?.trim() ? "neutral" : "success",
    },
  ];

  if (order.deliveryType === "delivery") {
    items.splice(1, 0,
      {
        label: order.address?.trim() ? "Endereço ok" : "Falta endereço",
        ok: Boolean(order.address?.trim()),
        tone: order.address?.trim() ? "success" : "warning",
      },
      {
        label: order.phone?.trim() ? "Telefone ok" : "Falta telefone",
        ok: Boolean(order.phone?.trim()),
        tone: order.phone?.trim() ? "success" : "warning",
      },
      {
        label: order.deliveryFee !== undefined && order.deliveryFee !== null ? "Taxa informada" : "Falta taxa",
        ok: order.deliveryFee !== undefined && order.deliveryFee !== null,
        tone: order.deliveryFee !== undefined && order.deliveryFee !== null ? "success" : "warning",
      },
    );
  } else {
    items.splice(1, 0, {
      label: order.phone?.trim() ? "Telefone ok" : order.origin === "delivery" ? "Falta telefone" : "Retirada no balcão",
      ok: order.origin !== "delivery" || Boolean(order.phone?.trim()),
      tone: order.origin !== "delivery" || order.phone?.trim() ? "success" : "warning",
    });
  }

  return items;
}
