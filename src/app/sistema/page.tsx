"use client";

import { ArrowRight, Banknote, Check, ChefHat, Clock3, PackageCheck, ReceiptText, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { OperationalOrderCard } from "@/components/operational-order-card";
import { Card } from "@/components/ui";
import { useStore } from "@/components/store-provider";
import { formatCurrency, isToday } from "@/lib/utils";
import { Order } from "@/lib/types";

function TaskSection({
  title,
  description,
  orders,
  focus,
  icon: Icon,
  empty,
  href,
}: {
  title: string;
  description: string;
  orders: Order[];
  focus: "operation" | "payment";
  icon: typeof ChefHat;
  empty: string;
  href: string;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f2e9f4] text-[var(--purple)]"><Icon size={18} /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-extrabold text-[var(--text)] md:text-lg">{title}</h2>
              <span className="grid min-w-6 place-items-center rounded-full bg-[var(--purple)] px-1.5 py-0.5 text-xs font-bold text-white">{orders.length}</span>
            </div>
            <p className="truncate text-xs text-[var(--muted)]">{description}</p>
          </div>
        </div>
        <Link href={href} className="flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--purple)]">Ver todos <ArrowRight size={14} /></Link>
      </div>
      {orders.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {orders.slice(0, 4).map((order) => <OperationalOrderCard key={order.id} order={order} focus={focus} compact />)}
        </div>
      ) : (
        <Card className="flex items-center gap-3 border-dashed px-4 py-4 text-sm text-slate-600">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={18} /></span>
          {empty}
        </Card>
      )}
    </section>
  );
}

export default function Dashboard() {
  const { orders } = useStore();
  const activeOrders = orders.filter((order) => order.orderStatus !== "canceled");
  const toPrepare = activeOrders.filter((order) => order.orderStatus === "new" || order.orderStatus === "preparing");
  const readyToDeliver = activeOrders.filter((order) => order.orderStatus === "ready");
  const toCollect = activeOrders.filter((order) => order.paymentStatus === "pending");
  const today = activeOrders.filter((order) => isToday(order.createdAt));
  const received = today.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.total, 0);
  const pendingTotal = today.filter((order) => order.paymentStatus === "pending").reduce((sum, order) => sum + order.total, 0);
  const sold = today.reduce((sum, order) => sum + order.total, 0);
  const averageTicket = today.length ? sold / today.length : 0;
  const taskCount = toPrepare.length + readyToDeliver.length + toCollect.length;

  const metrics = [
    { label: "Total vendido", value: formatCurrency(sold), icon: ReceiptText, tone: "bg-[#fff1f7] text-[#c83d76]" },
    { label: "Total recebido", value: formatCurrency(received), icon: Banknote, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Total pendente", value: formatCurrency(pendingTotal), icon: Clock3, tone: "bg-[#fff4cf] text-[#8a6300]" },
    { label: "Pedidos", value: String(today.length), icon: ShoppingBag, tone: "bg-[#f3ebf5] text-[#6d2779]" },
    { label: "Ticket médio", value: formatCurrency(averageTicket), icon: ReceiptText, tone: "bg-slate-100 text-slate-600" },
  ];

  return (
    <div className="grid min-w-0 gap-7 md:gap-9">
      <section className="min-w-0 rounded-2xl bg-[linear-gradient(135deg,#310740,#4a0b63)] p-4 text-white shadow-[0_16px_36px_rgba(36,0,47,.14)] md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#f8b900]">Agora</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-.03em]">{taskCount ? `${taskCount} ações pendentes` : "Operação em dia"}</h2>
            <p className="mt-1 text-sm text-purple-100/75">Prepare, entregue e receba sem sair desta tela.</p>
          </div>
          <Link href="/pedidos/novo" className="shrink-0 rounded-xl bg-[var(--yellow)] px-3 py-2.5 text-xs font-extrabold text-[var(--purple-dark)] sm:px-4 sm:text-sm">Novo pedido</Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link href="/pedidos?fila=preparar" className="group flex min-h-[108px] min-w-0 flex-col rounded-xl border border-white/[.08] bg-white/[.08] p-2.5 transition hover:-translate-y-0.5 hover:bg-white/[.14] active:scale-[.98] min-[390px]:p-3">
            <div className="flex items-center justify-between"><ChefHat size={17} className="text-pink-300" /><ArrowRight size={14} className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" /></div>
            <strong className="mt-2 block text-xl">{toPrepare.length}</strong><span className="text-[10px] font-semibold text-purple-100/80">Para preparar</span><span className="mt-auto text-[9px] text-purple-100/50">Abrir fila</span>
          </Link>
          <Link href="/pedidos?fila=entregar" className="group flex min-h-[108px] min-w-0 flex-col rounded-xl border border-white/[.08] bg-white/[.08] p-2.5 transition hover:-translate-y-0.5 hover:bg-white/[.14] active:scale-[.98] min-[390px]:p-3">
            <div className="flex items-center justify-between"><PackageCheck size={17} className="text-[#f8b900]" /><ArrowRight size={14} className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" /></div>
            <strong className="mt-2 block text-xl">{readyToDeliver.length}</strong><span className="text-[10px] font-semibold text-purple-100/80">Para entregar</span><span className="mt-auto text-[9px] text-purple-100/50">Abrir fila</span>
          </Link>
          <Link href="/pedidos?fila=cobrar" className="group flex min-h-[108px] min-w-0 flex-col rounded-xl border border-white/[.08] bg-white/[.08] p-2.5 transition hover:-translate-y-0.5 hover:bg-white/[.14] active:scale-[.98] min-[390px]:p-3">
            <div className="flex items-center justify-between"><Banknote size={17} className="text-emerald-300" /><ArrowRight size={14} className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" /></div>
            <strong className="mt-2 block text-xl">{toCollect.length}</strong><span className="text-[10px] font-semibold text-purple-100/80">Para cobrar</span><span className="mt-auto text-[9px] text-purple-100/50">Abrir fila</span>
          </Link>
        </div>
      </section>

      <TaskSection
        title="Pedidos para preparar"
        description="Novos pedidos e itens em produção"
        orders={toPrepare}
        focus="operation"
        icon={ChefHat}
        empty="Nenhum pedido aguardando preparo."
        href="/pedidos?fila=preparar"
      />
      <TaskSection
        title="Prontos para entregar"
        description="Pedidos aguardando retirada ou entrega"
        orders={readyToDeliver}
        focus="operation"
        icon={PackageCheck}
        empty="Nenhum pedido pronto aguardando entrega."
        href="/pedidos?fila=entregar"
      />
      <TaskSection
        title="Precisa cobrar"
        description="Pagamentos pendentes, inclusive de outros dias"
        orders={toCollect}
        focus="payment"
        icon={Banknote}
        empty="Nenhum pagamento pendente."
        href="/pedidos?fila=cobrar"
      />

      <section className="min-w-0">
        <div className="mb-3 flex items-end justify-between">
          <div><h2 className="text-lg font-extrabold text-[var(--text)]">Resumo de hoje</h2><p className="text-xs text-[var(--muted)]">Valores dos pedidos criados hoje</p></div>
          <Link href="/pedidos#fechamento" className="text-xs font-bold text-[var(--purple)]">Ver fechamento</Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
          {metrics.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="internal-metric min-w-0 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-semibold text-[var(--muted)] md:text-xs">{label}</p>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={15} /></span>
              </div>
              <p className="mt-2 truncate text-lg font-extrabold tracking-[-0.035em] text-[var(--text)]">{value}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
