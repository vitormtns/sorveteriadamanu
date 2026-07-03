import { OrderStatus } from "@/lib/types";
import { statusLabel } from "@/lib/utils";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const style = status === "paid" ? "bg-emerald-100 text-emerald-700" : status === "canceled" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{statusLabel[status]}</span>;
}
