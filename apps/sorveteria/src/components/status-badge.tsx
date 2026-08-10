import { OrderStatus, PaymentStatus } from "@/lib/types";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/utils";

export function PaymentStatusBadge({ status, contextual = false }: { status: PaymentStatus; contextual?: boolean }) {
  const style = status === "paid"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
  const label = contextual ? `Pagamento ${paymentStatusLabel[status].toLowerCase()}` : paymentStatusLabel[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${style}`}>{label}</span>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    new: "border-pink-200 bg-pink-50 text-[#b8326b]",
    preparing: "border-violet-200 bg-violet-50 text-[#6d2779]",
    ready: "border-amber-200 bg-[#fff8df] text-[#8a6300]",
    delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
    canceled: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles[status]}`}>{orderStatusLabel[status]}</span>;
}
