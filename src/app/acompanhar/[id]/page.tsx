"use client";

import { ArrowRight, Check, Clock3, MapPin, RefreshCw, ShoppingBag, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { useStore } from "@/components/store-provider";
import { Order } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { formatPublicOrderCode, getPublicOrderCode } from "@/lib/order-code";

function TrackingTimeline({ order }: { order: Order }) {
  const readyLabel = order.deliveryType === "delivery" ? "Pronto para entrega" : "Pronto para retirada";
  const steps = ["Pedido recebido", "Em preparo", readyLabel, "Finalizado"];
  const currentIndex = { new: 0, preparing: 1, ready: 2, delivered: 3, canceled: -1 }[order.orderStatus];
  const finished = order.orderStatus === "delivered";

  return (
    <div className="mt-5">
      {steps.map((label, index) => {
        const completed = finished || index < currentIndex;
        const active = !finished && index === currentIndex;
        return (
          <div key={label} className="relative grid min-h-[72px] grid-cols-[42px_1fr] gap-3 last:min-h-0">
            {index < steps.length - 1 && <span className={`absolute left-[19px] top-9 h-[calc(100%-1rem)] w-0.5 ${completed ? "bg-emerald-400" : "bg-[#e4d9e3]"}`} />}
            <span className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 ${completed ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-[var(--yellow)] bg-[var(--yellow)] text-[var(--purple-dark)] shadow-[0_0_0_6px_rgba(248,185,0,.12)]" : "border-[#dfd3df] bg-white text-slate-300"}`}>
              {completed ? <Check size={18} strokeWidth={3} /> : active ? <Clock3 size={18} strokeWidth={2.5} /> : <span className="h-2 w-2 rounded-full bg-current" />}
            </span>
            <div className="pt-1.5">
              <strong className={`block text-sm ${completed || active ? "text-[#24002f]" : "text-slate-400"}`}>{label}</strong>
              {active && <span className="mt-0.5 block text-xs font-semibold text-[#8a6300]">Etapa atual</span>}
              {completed && <span className="mt-0.5 block text-xs text-emerald-600">Concluído</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbf7f0] px-5 text-center">
      <div className="w-full max-w-md rounded-[28px] border border-[#eadfea] bg-white p-7 shadow-[0_20px_65px_rgba(50,8,65,.08)]">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f4eaf4] text-[#6d2779]"><ShoppingBag size={28} /></span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-.04em] text-[#24002f]">Pedido não encontrado</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#756878]">Não encontramos esse pedido neste dispositivo. Confira o link ou volte ao delivery.</p>
        <Link href="/delivery" className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--yellow)] px-5 font-extrabold text-[var(--purple-dark)]">Voltar ao delivery <ArrowRight size={18} /></Link>
      </div>
    </main>
  );
}

export default function TrackOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { orders, ready, refreshOrders } = useStore();
  const requested = decodeURIComponent(id).replace(/^#/, "").toUpperCase();
  const order = orders.find((item) => item.id === id || getPublicOrderCode(item).toUpperCase() === requested);

  if (!ready) return <main className="grid min-h-screen place-items-center bg-[#fbf7f0]"><RefreshCw className="animate-spin text-[#6d2779]" size={28} /><span className="sr-only">Carregando pedido</span></main>;
  if (!order) return <NotFound />;

  const statusTitle = {
    new: "Pedido recebido",
    preparing: "Seu pedido está em preparo",
    ready: order.deliveryType === "delivery" ? "Pronto para entrega" : "Pronto para retirada",
    delivered: "Pedido finalizado",
    canceled: "Pedido cancelado",
  }[order.orderStatus];

  return (
    <main className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_90%_0%,rgba(200,61,118,.08),transparent_22rem),#fbf7f0] pb-10 text-[#190620]">
      <header className="border-b border-[#eadfea] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/delivery" className="text-xs font-extrabold text-[#6d2779]">Novo pedido</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-3xl gap-4 px-4 py-6 md:gap-5 md:py-9">
        <section className="overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#310740,#5b126f)] p-5 text-white shadow-[0_18px_50px_rgba(50,8,65,.18)] md:p-7">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#f8d34f]">Acompanhe seu pedido</p><h1 className="mt-2 text-2xl font-extrabold tracking-[-.04em] md:text-3xl">{statusTitle}</h1><p className="mt-2 text-sm text-purple-100/70">{order.customerName}</p></div>
            <strong className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-sm tracking-[.08em]">{formatPublicOrderCode(order)}</strong>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-xs text-purple-100/75">
            <span>{order.deliveryType === "delivery" ? "Entrega" : "Retirada"}</span>
            <span>{formatCurrency(order.total)}</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
        </section>

        {order.orderStatus === "canceled" ? (
          <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600"><XCircle size={25} /></span>
            <h2 className="mt-3 text-lg font-extrabold text-red-800">Pedido cancelado</h2>
            <p className="mt-1 text-sm text-red-700">Se precisar de ajuda, entre em contato com a equipe da Manu.</p>
          </section>
        ) : (
          <section className="rounded-[24px] border border-[#eadfea] bg-white p-5 shadow-[0_14px_45px_rgba(50,8,65,.05)] md:p-6">
            <h2 className="font-extrabold">Andamento do pedido</h2>
            <TrackingTimeline order={order} />
            {order.orderStatus === "delivered" && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-700">Pedido finalizado. Obrigado por escolher a Manu!</p>}
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-[22px] border p-4 ${order.paymentStatus === "paid" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pagamento</p>
            <strong className={`mt-1 block text-sm ${order.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-800"}`}>{order.paymentStatus === "paid" ? "Pagamento confirmado" : "Pagamento pendente"}</strong>
            <span className="mt-1 block text-xs text-slate-600">{order.paymentMethod}</span>
          </div>
          <div className="rounded-[22px] border border-[#eadfea] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{order.deliveryType === "delivery" ? "Entrega" : "Retirada"}</p>
            <strong className="mt-1 block text-sm text-[#24002f]">{order.deliveryType === "delivery" ? "Receber em casa" : "Retirar no local"}</strong>
            {order.address && <span className="mt-1 flex items-start gap-1 text-xs leading-relaxed text-slate-600"><MapPin size={13} className="mt-0.5 shrink-0" /> {order.address}</span>}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#eadfea] bg-white p-5">
          <h2 className="font-extrabold">Resumo do pedido</h2>
          <div className="mt-3 divide-y divide-[#f0e7ef]">
            {order.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><strong className="block text-sm">{item.quantity}× {item.productName}</strong></div><span className="shrink-0 text-sm font-bold">{formatCurrency(item.unitPrice * item.quantity)}</span></div>)}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#eadfea] pt-4"><strong>Total</strong><strong className="text-xl text-[#6d2779]">{formatCurrency(order.total)}</strong></div>
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={refreshOrders} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[var(--purple)] px-5 text-sm font-extrabold text-white"><RefreshCw size={17} /> Atualizar</button>
          <Link href="/delivery" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[var(--yellow)] px-5 text-sm font-extrabold text-[var(--purple-dark)]">Fazer outro pedido <ArrowRight size={17} /></Link>
        </div>
        <p className="text-center text-[11px] text-[#817284]">Toque em Atualizar para verificar o andamento mais recente.</p>
      </div>
    </main>
  );
}
