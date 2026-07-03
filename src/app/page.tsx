"use client";

import { ArrowRight, Banknote, CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { useStore } from "@/components/store-provider";
import { formatCurrency, formatTime, isToday } from "@/lib/utils";

export default function Dashboard() {
  const { orders, updateOrder } = useStore();
  const today = orders.filter((order) => isToday(order.createdAt) && order.status !== "canceled");
  const pending = orders.filter((order) => order.status === "pending_payment").slice(0, 4);
  const sold = today.reduce((sum, order) => sum + order.total, 0);
  const received = today.filter((order) => order.status === "paid").reduce((sum, order) => sum + order.total, 0);
  const pendingTotal = today.filter((order) => order.status === "pending_payment").reduce((sum, order) => sum + order.total, 0);
  const cards = [
    { label: "Pedidos de hoje", value: String(today.length), icon: ShoppingBag, tone: "bg-purple-100 text-purple-700" },
    { label: "Vendido hoje", value: formatCurrency(sold), icon: Banknote, tone: "bg-pink-100 text-pink-700" },
    { label: "Recebido hoje", value: formatCurrency(received), icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" },
    { label: "Pendente hoje", value: formatCurrency(pendingTotal), icon: Clock3, tone: "bg-amber-100 text-amber-700" },
  ];

  return (
    <div className="grid gap-6">
      <section className="flex flex-col justify-between gap-4 rounded-3xl bg-[var(--purple)] p-6 text-white md:flex-row md:items-center">
        <div><p className="text-sm font-bold text-purple-200">Olá, Manu! 👋</p><h2 className="mt-1 text-2xl font-black">Tudo pronto para vender?</h2><p className="mt-2 text-sm text-purple-100">Acompanhe os pedidos e não deixe nenhuma cobrança para trás.</p></div>
        <Link href="/pedidos/novo"><Button variant="secondary" className="w-full md:w-auto">+ Novo pedido</Button></Link>
      </section>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => <Card key={label} className="p-4 md:p-5"><div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={20} /></div><p className="text-xs font-semibold text-slate-500 md:text-sm">{label}</p><p className="mt-1 text-lg font-black text-slate-900 md:text-2xl">{value}</p></Card>)}
      </section>
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-black text-slate-900">Pagamentos pendentes</h2><p className="text-sm text-slate-500">Cobranças que precisam de atenção</p></div><Link href="/pedidos" className="flex items-center gap-1 text-sm font-bold text-[var(--purple)]">Ver todos <ArrowRight size={16} /></Link></div>
        <div className="divide-y divide-slate-100">
          {pending.length === 0 && <p className="p-8 text-center text-slate-500">Nenhum pagamento pendente. Boa! 🎉</p>}
          {pending.map((order) => <div key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Link href={`/pedidos/${order.id}`} className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-bold text-slate-900">{order.customerName}</p><StatusBadge status={order.status} /></div><p className="mt-1 text-sm text-slate-500">{formatTime(order.createdAt)} · {order.paymentMethod}</p></Link>
            <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="font-black text-slate-900">{formatCurrency(order.total)}</span><Button onClick={() => updateOrder(order.id, { status: "paid" })} className="min-h-10 px-3">Marcar como pago</Button></div>
          </div>)}
        </div>
      </Card>
    </div>
  );
}
