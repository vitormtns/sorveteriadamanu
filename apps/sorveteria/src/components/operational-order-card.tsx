"use client";

import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChefHat,
  Clock3,
  CircleAlert,
  ExternalLink,
  MapPin,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useOrders } from "@/components/orders-provider";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Button, Card } from "@/components/ui";
import {
  getOrderAgeLabel,
  getOrderIssues,
  getOrderItemDetails,
} from "@/lib/order-operational";
import { Order } from "@/lib/types";
import { formatCurrency, formatTime } from "@/lib/utils";
import { paymentLabels } from "@/lib/settings";

type ActionFocus = "operation" | "payment" | "all";
type QueueContext = "default" | "prepare" | "deliver" | "collect";

const nextAction = {
  new: { label: "Iniciar preparo", shortLabel: "Iniciar", status: "preparing" as const, icon: ChefHat },
  preparing: { label: "Marcar pronto", shortLabel: "Pronto", status: "ready" as const, icon: CheckCircle2 },
  ready: { label: "Finalizar pedido", shortLabel: "Finalizar", status: "delivered" as const, icon: ArrowRight },
};

const contextStyles: Record<QueueContext, { bar: string; soft: string; pill: string; accent: string }> = {
  prepare: {
    bar: "from-[#c83d76] to-[#4a0b63]",
    soft: "bg-[#fff6fb]",
    pill: "bg-[#f7e9f4] text-[#6d2779]",
    accent: "text-[#c83d76]",
  },
  deliver: {
    bar: "from-[#35a277] to-[#5b66c8]",
    soft: "bg-[#f5fbff]",
    pill: "bg-[#e8f7f0] text-[#176c51]",
    accent: "text-[#24725a]",
  },
  collect: {
    bar: "from-[#f8b900] to-[#d86b21]",
    soft: "bg-[#fffaf0]",
    pill: "bg-amber-50 text-amber-800",
    accent: "text-[#996100]",
  },
  default: {
    bar: "from-[#ff6fae] to-[#f8b900]",
    soft: "bg-white",
    pill: "bg-[#f3eaf5] text-[#6d2779]",
    accent: "text-[var(--purple)]",
  },
};

function actionLabelFor(order: Order) {
  if (order.orderStatus === "ready") {
    return order.deliveryType === "delivery" ? "Finalizar entrega" : "Finalizar retirada";
  }
  return nextAction[order.orderStatus as keyof typeof nextAction]?.label;
}

function currentOperationLabel(order: Order) {
  if (order.orderStatus === "new") return "Novo pedido";
  if (order.orderStatus === "preparing") return "Em preparo";
  if (order.orderStatus === "ready") return order.deliveryType === "delivery" ? "Pronto para entrega" : "Pronto para retirada";
  if (order.orderStatus === "delivered") return order.deliveryType === "delivery" ? "Entregue" : "Retirado";
  return "Cancelado";
}

function InfoLine({ icon: Icon, children }: { icon: typeof Store; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1.5 text-[11px] font-bold leading-tight text-slate-600">
      <Icon size={13} className="shrink-0 text-slate-400" />
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}

export function OperationalOrderCard({
  order,
  focus = "all",
  compact = false,
  context = "default",
}: {
  order: Order;
  focus?: ActionFocus;
  compact?: boolean;
  context?: QueueContext;
}) {
  const { updateOperationalStatus, updatePaymentStatus, actioningOrderId, currentTime } = useOrders();
  const busy = actioningOrderId === order.id;
  const action = order.orderStatus in nextAction
    ? nextAction[order.orderStatus as keyof typeof nextAction]
    : null;
  const styles = contextStyles[context];
  const issues = getOrderIssues(order);
  const origin = order.origin === "delivery" ? "Pedido online" : "Balcão";
  const delivery = order.deliveryType === "delivery" ? "Entrega" : "Retirada";
  const showPaymentAction = order.paymentStatus === "pending" && (focus === "payment" || focus === "all" || context === "collect");
  const showOperation = action && (focus === "operation" || focus === "all") && context !== "collect";
  const actionLabel = actionLabelFor(order);
  const primaryIsPayment = context === "collect" || (showPaymentAction && !showOperation);
  const hasPrimary = order.orderStatus !== "canceled" && (primaryIsPayment || showOperation);
  const nextStepLabel = primaryIsPayment ? "Receber pagamento" : actionLabel;
  const mainItems = compact ? order.items.slice(0, 2) : order.items.slice(0, 3);
  const ActionIcon = action?.icon;
  const currentOperation = currentOperationLabel(order);

  return (
    <Card className={`internal-order-card min-w-0 ${styles.soft} ${compact ? "p-3 pl-5" : "p-3 pl-5 md:p-4 md:pl-6"}`}>
      <span className={`pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b ${styles.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-lg px-2 py-1 text-[11px] font-extrabold ${styles.pill}`}>#{order.id.slice(0, 6).toUpperCase()}</span>
            <span className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-bold text-slate-500">{getOrderAgeLabel(order, currentTime)}</span>
          </div>
          <h3 className="mt-2 truncate text-base font-extrabold leading-tight text-[var(--text)]">{order.customerName || "Cliente não informado"}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold">
            <span className={styles.accent}>{currentOperation}</span>
            {nextStepLabel && <span className="text-slate-500">Próxima ação: {nextStepLabel}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
          <p className="text-lg font-extrabold tracking-[-0.02em] text-[var(--text)]">{formatCurrency(order.total)}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <InfoLine icon={order.origin === "delivery" ? Truck : Store}>{origin}</InfoLine>
        <InfoLine icon={order.deliveryType === "delivery" ? MapPin : PackageCheck}>{delivery}</InfoLine>
        <InfoLine icon={ReceiptText}>Pagamento: {paymentLabels[order.paymentMethod]}</InfoLine>
        <InfoLine icon={Clock3}>Chegou às {formatTime(order.createdAt)}</InfoLine>
      </div>

      {context === "deliver" && order.deliveryType === "delivery" && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-white/80 p-3 text-xs font-semibold text-[#176c51]">
          <p className="line-clamp-2">{order.address || "Endereço não informado"}</p>
          {order.phone && <p className="mt-1 flex items-center gap-1.5 text-[#24725a]"><MessageCircle size={13} /> {order.phone}</p>}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-white/80 bg-white/85 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-extrabold text-slate-700">{context === "deliver" ? "O que será entregue" : context === "collect" ? "Resumo para cobrança" : "O que preparar agora"}</p>
          <span className="text-[10px] font-bold text-slate-400">{order.items.length} {order.items.length === 1 ? "item" : "itens"}</span>
        </div>
        {mainItems.length ? (
          <div className="grid gap-2">
            {mainItems.map((item) => {
              const details = getOrderItemDetails(item);
              return (
                <div key={item.id} className="min-w-0">
                  <div className="flex items-start justify-between gap-2 text-sm">
                    <p className="min-w-0 font-extrabold text-[var(--text)]"><span className={styles.accent}>{item.quantity}×</span> {item.productName.split(/\s(?:—|-|·)\s/)[0]}</p>
                    {context === "collect" && <span className="shrink-0 font-bold text-slate-600">{formatCurrency(item.quantity * item.unitPrice)}</span>}
                  </div>
                  {details.length > 0 && <ul className="mt-1 grid gap-0.5 text-[11px] font-semibold leading-relaxed text-slate-600">{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
                </div>
              );
            })}
            {order.items.length > mainItems.length && <p className="text-[11px] font-bold text-slate-400">+ {order.items.length - mainItems.length} {order.items.length - mainItems.length === 1 ? "item" : "itens"} no detalhe</p>}
          </div>
        ) : (
          <p className="text-sm font-bold text-amber-800">Pedido sem itens.</p>
        )}
        {order.notes?.trim() && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#fff7e6] px-2.5 py-2 text-[11px] font-bold leading-relaxed text-[#865900]"><CircleAlert className="mt-0.5 shrink-0" size={14} /> <span><strong>Atenção:</strong> {order.notes}</span></p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <PaymentStatusBadge status={order.paymentStatus} contextual />
        <OrderStatusBadge status={order.orderStatus} />
      </div>

      {issues.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {issues.slice(0, 4).map((issue) => (
            <span key={issue.label} className={`rounded-lg border px-2 py-1 text-[10px] font-extrabold ${issue.tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {issue.label}
            </span>
          ))}
        </div>
      )}

      {order.orderStatus !== "canceled" ? (
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 border-t border-white/80 pt-3 min-[390px]:grid-cols-[1fr_auto]">
          {hasPrimary && (
            primaryIsPayment ? (
              <Button disabled={busy} className="min-h-12 px-3 font-extrabold" onClick={() => void updatePaymentStatus(order.id, "paid")}>
                <Banknote size={17} /> Receber pagamento
              </Button>
            ) : (
              <Button disabled={busy} className="min-h-12 min-w-0 px-3 font-extrabold" onClick={() => void updateOperationalStatus(order.id, action!.status)}>
                {ActionIcon && <ActionIcon size={17} />} <span className="sm:hidden">{action!.shortLabel}</span><span className="hidden sm:inline">{actionLabel}</span>
              </Button>
            )
          )}
          {showPaymentAction && !primaryIsPayment && (
            <Button disabled={busy} variant="secondary" className="min-h-12 px-3" onClick={() => void updatePaymentStatus(order.id, "paid")}>
              <Banknote size={16} /> <span className="sm:hidden">Receber</span><span className="hidden sm:inline">Marcar como pago</span>
            </Button>
          )}
          <Link href={`/pedidos/${order.id}`} className={!hasPrimary && !showPaymentAction ? "min-[390px]:col-span-2" : ""}>
            <Button variant="ghost" className="min-h-11 w-full px-3"><ExternalLink size={15} /> Abrir</Button>
          </Link>
        </div>
      ) : (
        <Link href={`/pedidos/${order.id}`} className="mt-3 block border-t border-white/80 pt-3 text-center text-sm font-bold text-[var(--purple)]">
          Abrir pedido
        </Link>
      )}
    </Card>
  );
}
