"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, RefreshCw, ShoppingBag, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { TRACKING_POLL_INTERVAL_MS, shouldPollTracking } from "@/lib/order-sync";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/utils";

type TrackingOrder = {
  publicCode: string;
  orderStatus: "new" | "preparing" | "ready" | "delivered" | "canceled";
  paymentStatus: "pending" | "paid";
  deliveryType: "pickup" | "delivery";
  total: number | string;
  deliveryFee: number | string;
  createdAt: string;
  preparingAt?: string;
  readyAt?: string;
  completedAt?: string;
  canceledAt?: string;
  items: Array<{ name: string; quantity: number; subtotal: number | string }>;
};

class TrackingRequestError extends Error {
  constructor(public readonly notFound: boolean) {
    super(notFound ? "Pedido não encontrado" : "Falha ao atualizar pedido");
  }
}

function TrackingTimeline({ order }: { order: TrackingOrder }) {
  const readyLabel = order.deliveryType === "delivery" ? "Pronto para entrega" : "Pronto para retirada";
  const steps = ["Pedido recebido", "Em preparo", readyLabel, order.deliveryType === "delivery" ? "Entregue" : "Retirado"];
  const current = { new: 0, preparing: 1, ready: 2, delivered: 3, canceled: -1 }[order.orderStatus];
  const timestamps = [order.createdAt, order.preparingAt, order.readyAt, order.completedAt];

  return (
    <div className="mt-5">
      {steps.map((label, index) => {
        const done = order.orderStatus === "delivered" || index < current;
        const active = index === current;
        const timestamp = timestamps[index];
        return (
          <div key={label} className="relative grid min-h-[66px] grid-cols-[42px_1fr] gap-3 last:min-h-0">
            {index < 3 && <span className={`absolute left-[19px] top-9 h-[calc(100%-1rem)] w-0.5 ${done ? "bg-emerald-400" : "bg-[#e4d9e3]"}`} />}
            <span className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-[var(--yellow)] bg-[var(--yellow)] text-[var(--purple-dark)]" : "border-[#dfd3df] bg-white text-slate-300"}`}>
              {done ? <Check size={18} /> : active ? <Clock3 size={18} /> : <span className="h-2 w-2 rounded-full bg-current" />}
            </span>
            <div className="pt-1.5">
              <strong className="block text-sm">{label}</strong>
              {timestamp && <span className="mt-0.5 block text-xs text-slate-500">{formatDateTime(timestamp)}</span>}
              {active && <span className="text-xs text-[#8a6300]">Etapa atual</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrackOrderPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>();
  const orderRef = useRef<TrackingOrder | null>(null);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (requestController.current) return false;
    const controller = new AbortController();
    requestController.current = controller;
    const hasPreviousOrder = Boolean(orderRef.current);

    if (!silent || !hasPreviousOrder) setLoading(true);
    try {
      const response = await fetch(
        `/api/orders/tracking?code=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`,
        { cache: "no-store", signal: controller.signal },
      );
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== "object" || result === null || !("success" in result) || result.success !== true || !("order" in result)) {
        throw new TrackingRequestError(response.status === 404);
      }

      const nextOrder = result.order as TrackingOrder;
      orderRef.current = nextOrder;
      setOrder(nextOrder);
      setError("");
      setLastUpdatedAt(new Date().toISOString());
      return true;
    } catch (requestError) {
      if (controller.signal.aborted) return false;
      const notFound = requestError instanceof TrackingRequestError && requestError.notFound;
      if (!orderRef.current) {
        setError(notFound ? "Pedido não encontrado ou link inválido." : "Não foi possível carregar este pedido. Tente novamente.");
      } else {
        setError("Não foi possível atualizar agora. Mostramos as últimas informações disponíveis.");
      }
      return false;
    } finally {
      if (requestController.current === controller) requestController.current = null;
      if (!silent || !hasPreviousOrder) setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    let disposed = false;
    void Promise.resolve().then(() => {
      if (!disposed) return load();
      return false;
    });
    return () => {
      disposed = true;
      requestController.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };
    const schedule = () => {
      clearTimer();
      if (disposed || !shouldPollTracking(orderRef.current?.orderStatus, document.visibilityState === "visible", Boolean(requestController.current))) return;
      timer = setTimeout(async () => {
        await load({ silent: true });
        schedule();
      }, TRACKING_POLL_INTERVAL_MS);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") {
        clearTimer();
        return;
      }
      void load({ silent: true }).finally(schedule);
    };

    schedule();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      disposed = true;
      clearTimer();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [load, order?.orderStatus]);

  if (loading && !order) {
    return <main className="grid min-h-screen place-items-center bg-[#fbf7f0]"><RefreshCw className="animate-spin text-[#6d2779]" size={28} /></main>;
  }

  if (!order) {
    return <main className="grid min-h-screen place-items-center bg-[#fbf7f0] px-5 text-center"><div className="max-w-md rounded-[28px] border border-[#eadfea] bg-white p-7"><ShoppingBag className="mx-auto text-[#6d2779]" size={32} /><h1 className="mt-4 text-2xl font-extrabold">Pedido não encontrado</h1><p className="mt-2 text-sm text-slate-600">{error}</p><Link href="/delivery" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--yellow)] px-4 font-bold text-[var(--purple-dark)]">Voltar ao delivery <ArrowRight size={16} /></Link></div></main>;
  }

  const title = order.orderStatus === "canceled" ? "Pedido cancelado" : order.orderStatus === "delivered" ? "Pedido finalizado" : order.orderStatus === "ready" ? order.deliveryType === "delivery" ? "Pronto para entrega" : "Pronto para retirada" : order.orderStatus === "preparing" ? "Seu pedido está em preparo" : "Pedido recebido";
  return (
    <main className="min-h-screen bg-[#fbf7f0] pb-10 text-[#190620]">
      <header className="border-b border-[#eadfea] bg-white"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4"><Link href="/"><BrandLogo /></Link><Link href="/delivery" className="text-xs font-extrabold text-[#6d2779]">Novo pedido</Link></div></header>
      <div className="mx-auto grid max-w-3xl gap-4 px-4 py-6">
        <section className="rounded-[26px] bg-[linear-gradient(135deg,#310740,#5b126f)] p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#f8d34f]">Acompanhe seu pedido</p><h1 className="mt-2 text-2xl font-extrabold">{title}</h1><div className="mt-4 flex flex-wrap gap-3 text-xs text-purple-100"><strong>#{order.publicCode}</strong><span>{order.deliveryType === "delivery" ? "Entrega" : "Retirada"}</span><span>{formatDateTime(order.createdAt)}</span></div></section>
        {error && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{error}</p>}
        {order.orderStatus === "canceled" ? <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-center"><XCircle className="mx-auto text-red-600" /><h2 className="mt-2 font-extrabold text-red-800">Pedido cancelado</h2></section> : <section className="rounded-[24px] border border-[#eadfea] bg-white p-5"><h2 className="font-extrabold">Andamento do pedido</h2><TrackingTimeline order={order} /></section>}
        <section className="rounded-[24px] border border-[#eadfea] bg-white p-5"><h2 className="font-extrabold">Resumo do pedido</h2><div className="mt-3 divide-y divide-[#f0e7ef]">{order.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3 py-3 text-sm"><strong>{item.quantity}× {item.name}</strong><span>{formatCurrency(Number(item.subtotal))}</span></div>)}</div>{Number(order.deliveryFee) > 0 && <div className="flex justify-between border-t pt-3 text-sm"><span>Taxa de entrega</span><strong>{formatCurrency(Number(order.deliveryFee))}</strong></div>}<div className="mt-3 flex justify-between border-t pt-3 text-lg"><strong>Total</strong><strong>{formatCurrency(Number(order.total))}</strong></div></section>
        <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={() => void load()} disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--purple)] px-4 font-bold text-white disabled:opacity-60"><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Atualizar</button>{lastUpdatedAt && <span className="text-xs font-semibold text-slate-500">Atualizado às {formatTime(lastUpdatedAt)}</span>}</div>
      </div>
    </main>
  );
}
