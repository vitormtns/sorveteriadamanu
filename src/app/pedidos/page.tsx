"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardList, Edit3, Search, XCircle } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/components/store-provider";
import { Button, Card, Input } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime, isToday } from "@/lib/utils";

const filters = ["Hoje", "Todos", "Pagos", "Pendentes", "Cancelados"] as const;

export default function OrdersPage() {
  const { orders, updateOrder } = useStore();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Hoje");
  const [search, setSearch] = useState("");
  const visible = orders.filter((order) => {
    const matchesSearch = `${order.customerName} ${order.phone || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "Todos" || (filter === "Hoje" && isToday(order.createdAt)) || (filter === "Pagos" && order.status === "paid") || (filter === "Pendentes" && order.status === "pending_payment") || (filter === "Cancelados" && order.status === "canceled");
    return matchesSearch && matchesFilter;
  });

  return <div className="grid gap-5">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><h2 className="text-xl font-bold text-[var(--text)]">Histórico de pedidos</h2><p className="text-sm font-normal text-[var(--muted)]">Consulte e atualize os registros.</p></div><Link href="/pedidos/novo"><Button>+ Novo pedido</Button></Link></div>
    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
      <div className="relative max-w-xl"><Search className="absolute left-4 top-3.5 text-slate-400" size={20} /><Input className="pl-11" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente ou telefone..." /></div>
      <div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`min-h-11 shrink-0 rounded-[10px] border px-4 text-sm font-medium ${filter === item ? "border-[var(--purple)] bg-[var(--purple)] text-white" : "border-[var(--border)] bg-white text-slate-600"}`}>{item}</button>)}</div>
    </div>
    <Card className="overflow-hidden p-0">
      {visible.length === 0 && <div className="p-12 text-center"><ClipboardList className="mx-auto text-slate-300" size={28} /><p className="mt-3 font-bold">Nenhum pedido encontrado</p><p className="text-sm text-slate-500">Altere os filtros ou a busca.</p></div>}
      <div className="divide-y divide-slate-100">{visible.map((order) => <div key={order.id} className="grid gap-3 p-4 hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center">
        <Link href={`/pedidos/${order.id}`} className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-[var(--text)]">{order.customerName}</p><StatusBadge status={order.status} /></div><p className="mt-1 text-sm font-normal text-[var(--muted)]">{formatDateTime(order.createdAt)} · {order.paymentMethod} · {order.items.length} {order.items.length === 1 ? "item" : "itens"}</p></Link>
        <p className="text-lg font-bold text-[var(--text)]">{formatCurrency(order.total)}</p>
        <div className="flex flex-wrap gap-2">
          {order.status === "pending_payment" && <Button className="min-h-10 px-3" onClick={() => updateOrder(order.id, { status: "paid" })}><CheckCircle2 size={16} /> Receber</Button>}
          <Link href={`/pedidos/${order.id}`}><Button variant="ghost" className="min-h-10 px-3"><Edit3 size={16} /> Abrir</Button></Link>
          {order.status !== "canceled" && <Button variant="danger" className="min-h-10 px-3" onClick={() => confirm("Deseja cancelar este pedido?") && updateOrder(order.id, { status: "canceled" })}><XCircle size={16} /> Cancelar</Button>}
        </div>
      </div>)}</div>
    </Card>
  </div>;
}
