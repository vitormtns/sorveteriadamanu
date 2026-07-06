"use client";

import { ArrowRight, Banknote, CheckCircle2, ChefHat, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/components/store-provider";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Button, Card } from "@/components/ui";
import { Order } from "@/lib/types";
import { formatCurrency, formatTime } from "@/lib/utils";

type ActionFocus = "operation" | "payment" | "all";
type QueueContext = "default" | "prepare" | "deliver" | "collect";

const nextAction = {
  new: { label: "Iniciar preparo", shortLabel: "Iniciar", status: "preparing" as const, icon: ChefHat },
  preparing: { label: "Marcar pronto", shortLabel: "Pronto", status: "ready" as const, icon: CheckCircle2 },
  ready: { label: "Finalizar entrega", shortLabel: "Finalizar", status: "delivered" as const, icon: ArrowRight },
};

export function OperationalOrderCard({ order, focus = "all", compact = false, context = "default" }: { order: Order; focus?: ActionFocus; compact?: boolean; context?: QueueContext }) {
  const { updateOrder } = useStore();
  const action = order.orderStatus in nextAction
    ? nextAction[order.orderStatus as keyof typeof nextAction]
    : null;
  const origin = order.origin === "delivery" ? "Pedido online" : "Balcão";
  const delivery = order.deliveryType === "delivery" ? "Entrega" : "Retirada";
  const showPayment = order.paymentStatus === "pending" && (focus === "payment" || focus === "all");
  const showOperation = action && (focus === "operation" || focus === "all");

  return (
    <Card className={`internal-order-card min-w-0 ${compact ? "p-4 pl-5" : "p-4 pl-5 md:p-5 md:pl-6"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-bold text-[var(--text)]">{order.customerName}</h3>
            <span className="text-[10px] font-semibold text-slate-400">#{order.id.slice(0, 6).toUpperCase()}</span>
          </div>
          <p className={`mt-1 text-xs font-medium ${context === "deliver" ? "inline-flex rounded-md bg-violet-50 px-2 py-1 text-[#6d2779]" : "text-[var(--muted)]"}`}>{origin} · {delivery}</p>
        </div>
        <p className="shrink-0 text-lg font-extrabold tracking-[-0.03em] text-[var(--text)]">{formatCurrency(order.total)}</p>
      </div>

      <p className="mt-2 truncate text-sm text-slate-600">
        {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(" · ")}
      </p>
      {context === "deliver" && order.deliveryType === "delivery" && order.address && (
        <p className="mt-2 line-clamp-2 text-xs font-semibold text-[#6d2779]">{order.address}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-[var(--muted)]">{formatTime(order.createdAt)}</span>
        <span className={`text-xs font-semibold ${context === "collect" ? "rounded-md bg-amber-50 px-2 py-1 text-amber-800" : "text-[var(--muted)]"}`}>{context === "collect" ? order.paymentMethod : `· ${order.paymentMethod}`}</span>
        <PaymentStatusBadge status={order.paymentStatus} />
        <OrderStatusBadge status={order.orderStatus} />
      </div>

      {order.orderStatus !== "canceled" && (
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 border-t border-[var(--border)] pt-3 min-[390px]:grid-cols-2">
          {showPayment && (
            <Button className="min-h-11 px-3" onClick={() => updateOrder(order.id, { paymentStatus: "paid" })}>
              <Banknote size={17} /> Receber
            </Button>
          )}
          {showOperation && (
            <Button variant={showPayment ? "secondary" : "primary"} className="min-h-11 min-w-0 px-3" onClick={() => updateOrder(order.id, { orderStatus: action.status })}>
              <action.icon size={17} /> <span className="sm:hidden">{action.shortLabel}</span><span className="hidden sm:inline">{action.label}</span>
            </Button>
          )}
          <Link href={`/pedidos/${order.id}`} className={`min-w-0 ${showPayment && showOperation ? "min-[390px]:col-span-2" : !showPayment && !showOperation ? "min-[390px]:col-span-2" : ""}`}>
            <Button variant="ghost" className="min-h-10 w-full px-3"><ExternalLink size={15} /> Abrir</Button>
          </Link>
        </div>
      )}
      {order.orderStatus === "canceled" && (
        <Link href={`/pedidos/${order.id}`} className="mt-3 block border-t border-[var(--border)] pt-3 text-center text-sm font-bold text-[var(--purple)]">
          Abrir pedido
        </Link>
      )}
    </Card>
  );
}
