import { OrderStatus } from "@/lib/types";
import { statusLabel } from "@/lib/utils";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const style = status === "paid" ? "border-green-200 bg-green-50 text-[#15803d]" : status === "canceled" ? "border-slate-200 bg-slate-50 text-slate-600" : "border-[#f1dfb8] bg-[#fff8e8] text-[#b7791f]";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${style}`}>{statusLabel[status]}</span>;
}
