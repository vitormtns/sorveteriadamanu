"use client";

import { Suspense, useMemo, useState } from "react";
import { Banknote, CalendarDays, ClipboardList, Clock3, Printer, ReceiptText, Search, ShoppingBag, WalletCards } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/components/store-provider";
import { OperationalOrderCard } from "@/components/operational-order-card";
import { Card, Input, Select } from "@/components/ui";
import { Order } from "@/lib/types";
import { formatCurrency, formatDate, isSameDay, toDateInput } from "@/lib/utils";

const statusFilters = [
  { id: "new", label: "Novos" },
  { id: "preparing", label: "Em preparo" },
  { id: "ready", label: "Prontos" },
  { id: "pending", label: "Pendentes de pagamento" },
  { id: "paid", label: "Pagos" },
] as const;

type StatusFilter = "all" | (typeof statusFilters)[number]["id"];
type DatePreset = "today" | "yesterday" | "7days" | "custom" | "range" | "all";
type Queue = "preparar" | "entregar" | "cobrar" | "entregues" | "cancelados";

const queueTabs: { queue: Queue | null; label: string; href: string }[] = [
  { queue: null, label: "Todos", href: "/pedidos" },
  { queue: "preparar", label: "Preparar", href: "/pedidos?fila=preparar" },
  { queue: "entregar", label: "Entregar", href: "/pedidos?fila=entregar" },
  { queue: "cobrar", label: "Cobrar", href: "/pedidos?fila=cobrar" },
  { queue: "entregues", label: "Entregues", href: "/pedidos?fila=entregues" },
  { queue: "cancelados", label: "Cancelados", href: "/pedidos?fila=cancelados" },
];

const queueCopy: Record<Queue, { title: string; subtitle: string }> = {
  preparar: { title: "Para preparar", subtitle: "Pedidos novos e em preparo." },
  entregar: { title: "Para entregar", subtitle: "Pedidos prontos para retirada ou delivery." },
  cobrar: { title: "Para cobrar", subtitle: "Pedidos com pagamento pendente." },
  entregues: { title: "Entregues", subtitle: "Pedidos finalizados e entregues." },
  cancelados: { title: "Cancelados", subtitle: "Pedidos cancelados." },
};

function inputDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function matchesPeriod(order: Order, preset: DatePreset, customDate: string, rangeStart: string, rangeEnd: string) {
  const created = new Date(order.createdAt);
  const today = new Date();
  if (preset === "all") return true;
  if (preset === "today") return isSameDay(order.createdAt, today);
  if (preset === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(order.createdAt, yesterday);
  }
  if (preset === "7days") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return created >= start;
  }
  if (preset === "custom") return customDate ? isSameDay(order.createdAt, inputDate(customDate)) : true;
  const start = rangeStart ? inputDate(rangeStart) : null;
  const end = rangeEnd ? inputDate(rangeEnd) : null;
  if (end) end.setHours(23, 59, 59, 999);
  return (!start || created >= start) && (!end || created <= end);
}

function matchesStatus(order: Order, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "pending" || filter === "paid") return order.paymentStatus === filter && order.orderStatus !== "canceled";
  return order.orderStatus === filter;
}

function matchesQueue(order: Order, queue: Queue | null) {
  if (!queue) return true;
  if (queue === "preparar") return order.orderStatus === "new" || order.orderStatus === "preparing";
  if (queue === "entregar") return order.orderStatus === "ready";
  if (queue === "cobrar") return order.paymentStatus === "pending" && order.orderStatus !== "canceled";
  if (queue === "entregues") return order.orderStatus === "delivered";
  return order.orderStatus === "canceled";
}

function ClosingSummary({ orders }: { orders: Order[] }) {
  const [date, setDate] = useState(toDateInput(new Date()));
  const selectedDate = date ? inputDate(date) : new Date();
  const dayOrders = orders.filter((order) => isSameDay(order.createdAt, selectedDate));
  const valid = dayOrders.filter((order) => order.orderStatus !== "canceled");
  const canceled = dayOrders.filter((order) => order.orderStatus === "canceled");
  const pending = valid.filter((order) => order.paymentStatus === "pending");
  const unfinished = valid.filter((order) => order.orderStatus !== "delivered");
  const sold = valid.reduce((sum, order) => sum + order.total, 0);
  const received = valid.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.total, 0);
  const pendingTotal = pending.reduce((sum, order) => sum + order.total, 0);
  const canceledTotal = canceled.reduce((sum, order) => sum + order.total, 0);
  const averageTicket = valid.length ? sold / valid.length : 0;
  const methods = (["Pix", "Dinheiro", "Cartão", "Fiado/Outro"] as const).map((method) => ({
    method,
    quantity: valid.filter((order) => order.paymentMethod === method).length,
    total: valid.filter((order) => order.paymentMethod === method).reduce((sum, order) => sum + order.total, 0),
  }));

  const metrics = [
    { label: "Total vendido", value: formatCurrency(sold), icon: ReceiptText },
    { label: "Total recebido", value: formatCurrency(received), icon: Banknote },
    { label: "Total pendente", value: formatCurrency(pendingTotal), icon: Clock3 },
    { label: "Total cancelado", value: formatCurrency(canceledTotal), icon: WalletCards },
    { label: "Pedidos", value: String(valid.length), icon: ShoppingBag },
    { label: "Ticket médio", value: formatCurrency(averageTicket), icon: ReceiptText },
  ];

  return (
    <section id="fechamento" className="scroll-mt-24">
      <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h2 className="text-xl font-extrabold text-[var(--text)]">Fechamento do dia</h2><p className="text-sm text-[var(--muted)]">Conferência financeira e operacional de {formatDate(selectedDate)}.</p></div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
          <label className="relative block min-w-0">
            <CalendarDays className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17} />
            <Input aria-label="Data do fechamento" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-11 pl-10 text-sm" />
          </label>
          <button disabled title="Exportação em breve" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-bold text-slate-400"><Printer size={16} /> <span className="hidden sm:inline">Exportar</span></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="min-w-0 p-4">
            <div className="flex items-center justify-between gap-2"><p className="truncate text-[10px] font-semibold text-[var(--muted)]">{label}</p><Icon size={15} className="shrink-0 text-[var(--purple)]" /></div>
            <p className="mt-2 truncate text-lg font-extrabold tracking-[-.03em]">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-4">
          <h3 className="font-extrabold">Formas de pagamento</h3>
          <div className="mt-3 divide-y divide-[var(--border)]">
            {methods.map(({ method, quantity, total }) => (
              <div key={method} className="flex items-center justify-between py-2.5 text-sm">
                <span>{method} <small className="text-[var(--muted)]">· {quantity} {quantity === 1 ? "pedido" : "pedidos"}</small></span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-extrabold">Pendências do dia</h3>
          <div className="mt-3 grid gap-2">
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-800">Pagamentos pendentes · {pending.length}</p>
              {pending.length ? <div className="mt-1.5 divide-y divide-amber-200/60">{pending.slice(0, 3).map((order) => <Link key={order.id} href={`/pedidos/${order.id}`} className="flex justify-between gap-2 py-1.5 text-xs text-amber-800"><span className="truncate">{order.customerName}</span><strong>{formatCurrency(order.total)}</strong></Link>)}</div> : <p className="mt-1 text-xs text-amber-700">Nenhum pagamento pendente.</p>}
            </div>
            <div className="rounded-xl bg-violet-50 p-3">
              <p className="text-xs font-bold text-[#6d2779]">Pedidos não finalizados · {unfinished.length}</p>
              {unfinished.length ? <div className="mt-1.5 divide-y divide-violet-200/60">{unfinished.slice(0, 3).map((order) => <Link key={order.id} href={`/pedidos/${order.id}`} className="flex justify-between gap-2 py-1.5 text-xs text-[#6d2779]"><span className="truncate">{order.customerName}</span><strong>{order.orderStatus === "new" ? "Novo" : order.orderStatus === "preparing" ? "Em preparo" : "Pronto"}</strong></Link>)}</div> : <p className="mt-1 text-xs text-[#7f5687]">Todos os pedidos foram finalizados.</p>}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function OrdersView({ queue }: { queue: Queue | null }) {
  const { orders } = useStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>(queue ? "all" : "today");
  const [search, setSearch] = useState("");
  const [customDate, setCustomDate] = useState(toDateInput(new Date()));
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, "");
    return orders
      .filter((order) => {
        const searchable = `${order.customerName} ${order.phone || ""} ${order.id}`.toLowerCase();
        return searchable.includes(term)
          && matchesQueue(order, queue)
          && (queue ? true : matchesStatus(order, statusFilter))
          && matchesPeriod(order, datePreset, customDate, rangeStart, rangeEnd);
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [orders, search, statusFilter, datePreset, customDate, rangeStart, rangeEnd, queue]);

  const copy = queue ? queueCopy[queue] : { title: "Central de pedidos", subtitle: "Visão geral e histórico de pedidos." };
  const cardFocus: "operation" | "payment" | "all" = queue === "preparar" || queue === "entregar" ? "operation" : queue === "cobrar" ? "payment" : "all";
  const cardContext: "prepare" | "deliver" | "collect" | "default" = queue === "preparar" ? "prepare" : queue === "entregar" ? "deliver" : queue === "cobrar" ? "collect" : "default";

  return (
    <div className="grid gap-8">
      <section>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div><h2 className="text-xl font-extrabold text-[var(--text)]">{copy.title}</h2><p className="text-sm text-[var(--muted)]">{copy.subtitle} <span>· {visible.length} {visible.length === 1 ? "pedido" : "pedidos"}</span></p></div>
          <Link href="/pedidos/novo" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--yellow)] px-4 text-sm font-extrabold text-[var(--purple-dark)]">+ Novo pedido</Link>
        </div>

        <nav aria-label="Filas de pedidos" className="mt-4 grid grid-cols-2 gap-2 min-[390px]:grid-cols-3 sm:grid-cols-6">
          {queueTabs.map((tab) => (
            <Link key={tab.label} href={tab.href} aria-current={queue === tab.queue ? "page" : undefined} className={`inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl border px-2 text-xs font-bold transition active:scale-[.98] sm:text-sm ${queue === tab.queue ? "border-[var(--purple)] bg-[var(--purple)] text-white shadow-[0_6px_16px_rgba(58,10,77,.16)]" : "border-[var(--border)] bg-white text-slate-600 hover:border-[#ccb6d0] hover:text-[var(--purple)]"}`}>
              {tab.label}
            </Link>
          ))}
        </nav>

        <Card className="mt-4 grid gap-3 p-3 md:p-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={19} />
            <Input className="pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por cliente, telefone ou número do pedido" />
          </div>
          {!queue && (
            <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3 sm:grid-cols-5">
              <button onClick={() => setStatusFilter("all")} className={`min-h-10 min-w-0 rounded-xl border px-2 text-xs font-bold ${statusFilter === "all" ? "border-[#8e5799] bg-[#f2e9f4] text-[var(--purple)]" : "border-[var(--border)] bg-white text-slate-600"}`}>
                Todas as situações
              </button>
              {statusFilters.map((item) => (
                <button key={item.id} onClick={() => setStatusFilter(item.id)} className={`min-h-10 min-w-0 rounded-xl border px-2 text-xs font-bold ${statusFilter === item.id ? "border-[#8e5799] bg-[#f2e9f4] text-[var(--purple)]" : "border-[var(--border)] bg-white text-slate-600"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
            <Select aria-label="Período" value={datePreset} onChange={(event) => setDatePreset(event.target.value as DatePreset)} className="min-h-11 text-sm">
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="custom">Escolher data</option>
              <option value="range">Intervalo</option>
              <option value="all">Todos os dias</option>
            </Select>
            {datePreset === "custom" && <Input aria-label="Data escolhida" type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="min-h-11 text-sm" />}
            {datePreset === "range" && (
              <div className="grid min-w-0 grid-cols-1 gap-2 min-[390px]:grid-cols-2">
                <Input aria-label="Data inicial" type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} className="min-h-11 min-w-0 text-sm" />
                <Input aria-label="Data final" type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} className="min-h-11 min-w-0 text-sm" />
              </div>
            )}
          </div>
        </Card>

        {visible.length ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {visible.map((order) => <OperationalOrderCard key={order.id} order={order} focus={cardFocus} context={cardContext} />)}
          </div>
        ) : (
          <Card className="mt-4 py-12 text-center">
            <ClipboardList className="mx-auto text-slate-300" size={30} />
            <p className="mt-3 font-extrabold">{queue ? "Nenhum pedido nesta fila" : "Nenhum pedido encontrado"}</p>
            <p className="text-sm text-slate-500">Ajuste o período ou a busca.</p>
          </Card>
        )}
      </section>

      {!queue && <ClosingSummary orders={orders} />}
    </div>
  );
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const value = searchParams.get("fila");
  const queue = queueTabs.some((tab) => tab.queue === value) ? value as Queue : null;
  return <OrdersView key={queue ?? "todos"} queue={queue} />;
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<Card className="py-12 text-center text-sm text-[var(--muted)]">Carregando pedidos...</Card>}>
      <OrdersPageContent />
    </Suspense>
  );
}
