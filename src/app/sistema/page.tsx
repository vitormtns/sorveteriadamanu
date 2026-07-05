"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { useStore } from "@/components/store-provider";
import { formatCurrency, formatTime, isToday } from "@/lib/utils";

export default function Dashboard() {
  const { orders, updateOrder } = useStore();
  const today = orders.filter((order) => isToday(order.createdAt) && order.status !== "canceled");
  const pending = orders.filter((order) => order.status === "pending_payment");
  const recent = orders.slice(0, 6);
  const received = today.filter((order) => order.status === "paid").reduce((sum, order) => sum + order.total, 0);
  const pendingTotal = today.filter((order) => order.status === "pending_payment").reduce((sum, order) => sum + order.total, 0);
  const sold = today.reduce((sum, order) => sum + order.total, 0);
  const metrics = [
    { label: "Pedidos de hoje", value: String(today.length).padStart(2, "0") },
    { label: "Total vendido hoje", value: formatCurrency(sold) },
    { label: "Total recebido hoje", value: formatCurrency(received) },
    { label: "Total pendente hoje", value: formatCurrency(pendingTotal), highlight: true },
  ];

  return (
    <div className="grid gap-6 md:gap-8">
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div><h2 className="text-sm font-semibold text-[var(--text)]">Resumo</h2></div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {metrics.map(({ label, value, highlight }) => (
            <Card key={label} className={`relative min-w-0 overflow-hidden px-4 py-4 md:px-5 md:py-5 ${highlight ? "border-[#e8cf84] bg-[#fffaf0]" : "bg-white/90"}`}>
              {highlight && <span className="absolute inset-x-0 top-0 h-[3px] bg-[var(--yellow)]" />}
              <p className="truncate text-[10px] font-medium text-[var(--muted)] md:text-xs">{label}</p>
              <p className="mt-2 truncate text-lg font-bold tracking-[-0.03em] text-[var(--text)] md:text-[22px]">{value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><h2 className="text-[17px] font-bold text-[var(--text)]">Pendentes</h2><span className="grid min-w-6 place-items-center rounded-full bg-[#fff7e6] px-1.5 py-0.5 text-xs font-semibold text-[#b7791f]">{pending.length}</span></div><Link href="/pedidos" className="flex items-center gap-1 text-xs font-semibold text-[var(--purple)]">Ver todos <ArrowRight size={15} /></Link></div>
        {pending.length === 0 ? <Card className="py-9 text-center"><Check className="mx-auto text-emerald-600" /><p className="mt-2 font-bold">Nenhum pagamento pendente</p></Card> :
        <div className="grid gap-3 xl:grid-cols-2">
          {pending.slice(0, 4).map((order) => (
            <Card key={order.id} className="p-4 md:p-5">
              <div>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate font-semibold text-[var(--text)]">{order.customerName}</h3><StatusBadge status={order.status} /></div><p className="mt-1 text-xs font-normal text-[var(--muted)]">{formatTime(order.createdAt)} · {order.paymentMethod}</p></div><p className="shrink-0 text-xl font-bold tracking-[-0.02em] text-[var(--text)]">{formatCurrency(order.total)}</p></div>
                <p className="mt-3 truncate text-sm font-normal text-[var(--muted)]">{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(" · ")}</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button className="min-h-11" onClick={() => updateOrder(order.id, { status: "paid" })}>Receber</Button>
                <Link href={`/pedidos/${order.id}`}><Button variant="ghost" className="w-full">Editar</Button></Link>
                <Button variant="ghost" onClick={() => confirm("Deseja cancelar este pedido?") && updateOrder(order.id, { status: "canceled" })}>Cancelar</Button>
              </div>
            </Card>
          ))}
        </div>}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[17px] font-bold text-[var(--text)]">Últimos pedidos</h2><Link href="/pedidos" className="text-xs font-semibold text-[var(--purple)]">Abrir pedidos</Link></div>
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-[#ebe6df]">
            {recent.map((order) => <Link href={`/pedidos/${order.id}`} key={order.id} className="grid grid-cols-[1fr_auto] items-center gap-3 p-4 transition hover:bg-[#fcfaf6] sm:grid-cols-[1fr_auto_auto]">
              <div className="min-w-0"><p className="truncate font-semibold text-[var(--text)]">{order.customerName}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{formatTime(order.createdAt)} · {order.paymentMethod}</p></div>
              <div className="hidden sm:block"><StatusBadge status={order.status} /></div>
              <p className="font-bold text-[var(--text)]">{formatCurrency(order.total)}</p>
            </Link>)}
          </div>
        </Card>
      </section>
    </div>
  );
}
