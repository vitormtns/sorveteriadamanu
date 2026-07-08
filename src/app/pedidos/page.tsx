"use client";

import { Suspense, useMemo, useState } from "react";
import { Banknote, CalendarDays, ClipboardList, Clock3, PackageCheck, Printer, ReceiptText, Search, ShoppingBag, SlidersHorizontal, Store, Truck, WalletCards } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/components/store-provider";
import { OperationalOrderCard } from "@/components/operational-order-card";
import { Card, Input, Select } from "@/components/ui";
import { Order } from "@/lib/types";
import { formatCurrency, formatDate, isSameDay, toDateInput } from "@/lib/utils";
import { paymentLabels } from "@/lib/settings";

type DetailFilter =
  | "all"
  | "new"
  | "preparing"
  | "ready"
  | "delivered"
  | "payment_pending"
  | "paid"
  | "canceled"
  | "ready_pickup"
  | "ready_delivery"
  | "collect_delivered"
  | "collect_active";
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

const primaryQueueTabs: { queue: Queue | null; label: string; href: string }[] = [
  { queue: "preparar", label: "Preparar", href: "/pedidos?fila=preparar" },
  { queue: "entregar", label: "Entregar", href: "/pedidos?fila=entregar" },
  { queue: "cobrar", label: "Cobrar", href: "/pedidos?fila=cobrar" },
  { queue: null, label: "Todos", href: "/pedidos" },
];
const secondaryQueueTabs = queueTabs.filter((tab) => tab.queue === "entregues");

const queueCopy: Record<Queue, { title: string; subtitle: string }> = {
  preparar: { title: "Para preparar", subtitle: "Pedidos novos e em preparo." },
  entregar: { title: "Para entregar", subtitle: "Pedidos prontos para retirada ou entrega." },
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

function matchesDetailFilter(order: Order, filter: DetailFilter) {
  if (filter === "all") return true;
  if (filter === "payment_pending") return order.paymentStatus === "pending" && order.orderStatus !== "canceled";
  if (filter === "paid") return order.paymentStatus === "paid" && order.orderStatus !== "canceled";
  if (filter === "ready_pickup") return order.orderStatus === "ready" && order.deliveryType === "pickup";
  if (filter === "ready_delivery") return order.orderStatus === "ready" && order.deliveryType === "delivery";
  if (filter === "collect_delivered") return order.paymentStatus === "pending" && order.orderStatus === "delivered";
  if (filter === "collect_active") return order.paymentStatus === "pending" && ["new", "preparing", "ready"].includes(order.orderStatus);
  return order.orderStatus === filter;
}

function detailFilterOptions(queue: Queue | null): { value: DetailFilter; label: string }[] {
  if (queue === "preparar") return [
    { value: "all", label: "Todos da fila" },
    { value: "new", label: "Novos" },
    { value: "preparing", label: "Em preparo" },
  ];

  if (queue === "entregar") return [
    { value: "all", label: "Todos da fila" },
    { value: "ready_pickup", label: "Prontos para retirada" },
    { value: "ready_delivery", label: "Prontos para entrega" },
  ];

  if (queue === "cobrar") return [
    { value: "all", label: "Todos pendentes" },
    { value: "collect_delivered", label: "Já entregues" },
    { value: "collect_active", label: "Ainda em preparo/prontos" },
  ];

  return [
    { value: "all", label: "Todos os status" },
    { value: "new", label: "Novo" },
    { value: "preparing", label: "Em preparo" },
    { value: "ready", label: "Pronto" },
    { value: "delivered", label: "Entregue" },
    { value: "payment_pending", label: "Pagamento pendente" },
    { value: "paid", label: "Pago" },
    { value: "canceled", label: "Cancelado" },
  ];
}

function matchesQueue(order: Order, queue: Queue | null) {
  if (!queue) return true;
  if (queue === "preparar") return order.orderStatus === "new" || order.orderStatus === "preparing";
  if (queue === "entregar") return order.orderStatus === "ready";
  if (queue === "cobrar") return order.paymentStatus === "pending" && order.orderStatus !== "canceled";
  if (queue === "entregues") return order.orderStatus === "delivered";
  return order.orderStatus === "canceled";
}

function oldestOrderLabel(orders: Order[]) {
  if (!orders.length) return "Sem pedidos";
  const oldest = orders.reduce((selected, order) => new Date(order.createdAt) < new Date(selected.createdAt) ? order : selected, orders[0]);
  return `#${oldest.id.slice(0, 6).toUpperCase()}`;
}

function QueueHeaderSummary({ queue, orders }: { queue: Queue | null; orders: Order[] }) {
  const valid = orders.filter((order) => order.orderStatus !== "canceled");
  const pendingPayment = valid.filter((order) => order.paymentStatus === "pending");
  const total = valid.reduce((sum, order) => sum + order.total, 0);
  const pickup = valid.filter((order) => order.deliveryType === "pickup");
  const delivery = valid.filter((order) => order.deliveryType === "delivery");
  const delivered = valid.filter((order) => order.orderStatus === "delivered");
  const active = valid.filter((order) => order.orderStatus !== "delivered");

  const metrics = queue === "preparar" ? [
    { label: "Na fila", value: String(valid.length), icon: ShoppingBag },
    { label: "Valor", value: formatCurrency(total), icon: ReceiptText },
    { label: "A cobrar", value: String(pendingPayment.length), icon: Banknote },
    { label: "Mais antigo", value: oldestOrderLabel(valid), icon: Clock3 },
  ] : queue === "entregar" ? [
    { label: "Prontos", value: String(valid.length), icon: PackageCheck },
    { label: "Retirada", value: String(pickup.length), icon: Store },
    { label: "Entrega", value: String(delivery.length), icon: Truck },
    { label: "A cobrar", value: String(pendingPayment.length), icon: Banknote },
  ] : queue === "cobrar" ? [
    { label: "Pendentes", value: String(pendingPayment.length), icon: Banknote },
    { label: "Valor pendente", value: formatCurrency(pendingPayment.reduce((sum, order) => sum + order.total, 0)), icon: ReceiptText },
    { label: "Já entregues", value: String(delivered.length), icon: PackageCheck },
    { label: "Em andamento", value: String(active.length), icon: Clock3 },
  ] : queue === "entregues" ? [
    { label: "Finalizados", value: String(valid.length), icon: PackageCheck },
    { label: "Valor", value: formatCurrency(total), icon: ReceiptText },
    { label: "A cobrar", value: String(pendingPayment.length), icon: Banknote },
  ] : queue === "cancelados" ? [
    { label: "Cancelados", value: String(orders.length), icon: ClipboardList },
    { label: "Valor", value: formatCurrency(orders.reduce((sum, order) => sum + order.total, 0)), icon: ReceiptText },
  ] : [
    { label: "Pendências", value: String(valid.filter((order) => order.orderStatus !== "delivered" || order.paymentStatus === "pending").length), icon: ClipboardList },
    { label: "Preparar", value: String(valid.filter((order) => order.orderStatus === "new" || order.orderStatus === "preparing").length), icon: ShoppingBag },
    { label: "Entregar", value: String(valid.filter((order) => order.orderStatus === "ready").length), icon: Truck },
    { label: "Cobrar", value: String(pendingPayment.length), icon: Banknote },
  ];

  return (
    <div className="mt-2 hidden gap-2 md:grid md:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon }) => (
        <div key={label} className="min-w-0 rounded-xl border border-white/75 bg-white/75 px-3 py-2 shadow-[0_8px_24px_rgba(36,0,47,.03)]">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-extrabold uppercase text-slate-400">{label}</span>
            <Icon size={14} className="shrink-0 text-[var(--purple)]" />
          </div>
          <strong className="mt-0.5 block truncate text-sm font-extrabold text-[var(--text)]">{value}</strong>
        </div>
      ))}
    </div>
  );
}

function compactQueueSummary(queue: Queue | null, orders: Order[]) {
  const valid = orders.filter((order) => order.orderStatus !== "canceled");
  const pendingPayment = valid.filter((order) => order.paymentStatus === "pending");
  const pendingValue = pendingPayment.reduce((sum, order) => sum + order.total, 0);
  const countLabel = `${valid.length} ${valid.length === 1 ? "pedido" : "pedidos"}`;

  if (queue === "preparar") {
    const news = valid.filter((order) => order.orderStatus === "new").length;
    const preparing = valid.filter((order) => order.orderStatus === "preparing").length;
    return `${countLabel} · ${news} ${news === 1 ? "novo" : "novos"} · ${preparing} em preparo`;
  }

  if (queue === "entregar") {
    const pickup = valid.filter((order) => order.deliveryType === "pickup").length;
    const delivery = valid.filter((order) => order.deliveryType === "delivery").length;
    return `${countLabel} · ${pickup} retirada${pickup === 1 ? "" : "s"} · ${delivery} entrega${delivery === 1 ? "" : "s"}`;
  }

  if (queue === "cobrar") {
    const delivered = valid.filter((order) => order.orderStatus === "delivered").length;
    return `${countLabel} · ${formatCurrency(pendingValue)} pendente · ${delivered} já entregue${delivered === 1 ? "" : "s"}`;
  }

  if (queue === "entregues") return `${countLabel} concluído${valid.length === 1 ? "" : "s"} · ${pendingPayment.length} a cobrar`;
  if (queue === "cancelados") return `${orders.length} ${orders.length === 1 ? "pedido cancelado" : "pedidos cancelados"}`;

  const prepare = valid.filter((order) => order.orderStatus === "new" || order.orderStatus === "preparing").length;
  const ready = valid.filter((order) => order.orderStatus === "ready").length;
  return `${countLabel} · ${prepare} para preparar · ${ready} para entregar · ${formatCurrency(pendingValue)} pendente`;
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
                <span>{paymentLabels[method]} <small className="text-[var(--muted)]">· {quantity} {quantity === 1 ? "pedido" : "pedidos"}</small></span>
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
  const [detailFilter, setDetailFilter] = useState<DetailFilter>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>(queue ? "all" : "today");
  const [search, setSearch] = useState("");
  const [customDate, setCustomDate] = useState(toDateInput(new Date()));
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, "");
    return orders
      .filter((order) => {
        const searchable = `${order.customerName} ${order.phone || ""} ${order.id}`.toLowerCase();
        return searchable.includes(term)
          && matchesQueue(order, queue)
          && matchesDetailFilter(order, detailFilter)
          && matchesPeriod(order, datePreset, customDate, rangeStart, rangeEnd);
      })
      .sort((a, b) => queue ? +new Date(a.createdAt) - +new Date(b.createdAt) : +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [orders, search, detailFilter, datePreset, customDate, rangeStart, rangeEnd, queue]);

  const copy = queue ? queueCopy[queue] : { title: "Pedidos", subtitle: "Visão geral das pendências do dia." };
  const compactSummary = compactQueueSummary(queue, visible);
  const hasAdvancedFilter = Boolean(search.trim()) || datePreset !== (queue ? "all" : "today") || detailFilter !== "all";
  const detailOptions = detailFilterOptions(queue);
  const cardFocus: "operation" | "payment" | "all" = queue === "preparar" || queue === "entregar" ? "operation" : queue === "cobrar" ? "payment" : "all";
  const cardContext: "prepare" | "deliver" | "collect" | "default" = queue === "preparar" ? "prepare" : queue === "entregar" ? "deliver" : queue === "cobrar" ? "collect" : "default";

  return (
    <div className="grid gap-4 md:gap-6">
      <section>
        <div className="rounded-2xl border border-white/70 bg-white/60 p-2.5 shadow-[0_10px_28px_rgba(36,0,47,.035)] backdrop-blur md:p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold tracking-[-.025em] text-[var(--text)] md:text-2xl">{copy.title}</h2>
              <p className="mt-0.5 text-xs font-semibold text-[var(--muted)] md:hidden">{compactSummary}</p>
              <p className="mt-0.5 hidden text-sm text-[var(--muted)] md:block">{copy.subtitle} <span>· {compactSummary}</span></p>
            </div>
            <Link href="/pedidos/novo" className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-[var(--yellow)] px-3 text-xs font-extrabold text-[var(--purple-dark)] shadow-[0_8px_20px_rgba(248,185,0,.16)] md:min-h-10 md:text-sm">+ Novo pedido</Link>
          </div>
          <QueueHeaderSummary queue={queue} orders={visible} />
        </div>

        <nav aria-label="Filas de pedidos" className="mt-2 grid grid-cols-4 gap-1.5 md:grid-cols-6 md:gap-2">
          {primaryQueueTabs.map((tab) => (
            <Link key={tab.label} href={tab.href} aria-current={queue === tab.queue ? "page" : undefined} className={`inline-flex min-h-9 min-w-0 items-center justify-center rounded-xl border px-2 text-[11px] font-bold transition active:scale-[.98] md:min-h-10 md:text-sm ${queue === tab.queue ? "border-[var(--purple)] bg-[var(--purple)] text-white shadow-[0_6px_16px_rgba(58,10,77,.16)]" : "border-[var(--border)] bg-white text-slate-600 hover:border-[#ccb6d0] hover:text-[var(--purple)]"}`}>
              {tab.label}
            </Link>
          ))}
          {secondaryQueueTabs.map((tab) => (
            <Link key={tab.label} href={tab.href} aria-current={queue === tab.queue ? "page" : undefined} className={`hidden min-h-10 min-w-0 items-center justify-center rounded-xl border px-2 text-sm font-bold transition active:scale-[.98] md:inline-flex ${queue === tab.queue ? "border-[var(--purple)] bg-[var(--purple)] text-white shadow-[0_6px_16px_rgba(58,10,77,.16)]" : "border-[var(--border)] bg-white text-slate-600 hover:border-[#ccb6d0] hover:text-[var(--purple)]"}`}>
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className="mt-1.5 flex gap-2 md:hidden">
          {secondaryQueueTabs.map((tab) => (
            <Link key={tab.label} href={tab.href} aria-current={queue === tab.queue ? "page" : undefined} className={`inline-flex min-h-7 items-center rounded-lg border px-2.5 text-[10px] font-bold ${queue === tab.queue ? "border-[#8e5799] bg-[#f2e9f4] text-[var(--purple)]" : "border-transparent bg-white/60 text-slate-500"}`}>
              {tab.label}
            </Link>
          ))}
        </div>

        <button type="button" onClick={() => setFiltersOpen((current) => !current)} className="mt-2 inline-flex min-h-9 w-full items-center justify-between rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-extrabold text-[var(--purple)] md:hidden">
          <span className="inline-flex items-center gap-2"><SlidersHorizontal size={15} /> Buscar pedido</span>
          <span className="text-[10px] text-slate-500">{hasAdvancedFilter ? "Busca ativa" : filtersOpen ? "Ocultar" : "Abrir"}</span>
        </button>

        <Card className={`mt-2 gap-2 p-2.5 md:grid md:grid-cols-[minmax(240px,1fr)_180px_190px] md:items-start md:p-2.5 ${filtersOpen ? "grid" : "hidden"}`}>
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-3 text-slate-400" size={17} />
            <Input className="min-h-10 pl-9 text-sm md:min-h-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, telefone ou pedido" />
          </div>
          <Select aria-label="Status detalhado" value={detailFilter} onChange={(event) => setDetailFilter(event.target.value as DetailFilter)} className="min-h-10 text-sm md:min-h-11">
            {detailOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <div className="grid gap-2 sm:grid-cols-[180px_1fr] md:col-span-3">
            <Select aria-label="Período" value={datePreset} onChange={(event) => setDatePreset(event.target.value as DatePreset)} className="min-h-10 text-sm md:min-h-11">
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="custom">Escolher data</option>
              <option value="range">Intervalo</option>
              <option value="all">Todos os dias</option>
            </Select>
            {datePreset === "custom" && <Input aria-label="Data escolhida" type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="min-h-10 text-sm md:min-h-11" />}
            {datePreset === "range" && (
              <div className="grid min-w-0 grid-cols-1 gap-2 min-[390px]:grid-cols-2">
                <Input aria-label="Data inicial" type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} className="min-h-10 min-w-0 text-sm md:min-h-11" />
                <Input aria-label="Data final" type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} className="min-h-10 min-w-0 text-sm md:min-h-11" />
              </div>
            )}
          </div>
        </Card>

        {visible.length ? (
          <div className="mt-2 grid gap-3 xl:grid-cols-2">
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
