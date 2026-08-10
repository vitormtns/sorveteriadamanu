"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useOrders } from "@/components/orders-provider";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { formatPublicOrderCode } from "@/lib/order-code";
import { paymentLabels } from "@/lib/settings";
import { getOrderItemDetails } from "@/lib/order-operational";

export default function PrintOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { orders, ready } = useOrders();
  const order = orders.find((item) => item.id === id);
  const receiptRef = useRef<HTMLElement>(null);
  const [pageHeightMm, setPageHeightMm] = useState(160);
  const [printReady, setPrintReady] = useState(false);

  useLayoutEffect(() => {
    if (!ready || !order || !receiptRef.current) return;
    const heightMm = Math.ceil(receiptRef.current.scrollHeight * 25.4 / 96) + 2;
    setPageHeightMm(Math.max(60, heightMm));
    setPrintReady(true);
  }, [ready, order]);

  useEffect(() => {
    if (!printReady) return;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [printReady]);

  if (!ready) return <main className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500">Preparando a via...</main>;
  if (!order) return <main className="grid min-h-screen place-items-center bg-slate-100 px-5 text-center"><div><p className="font-bold">Pedido não encontrado.</p><Link href="/pedidos" className="mt-3 inline-block text-[var(--purple)]">Voltar aos pedidos</Link></div></main>;

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-6 text-black print:bg-white print:p-0">
      <style>{`
        @page { size: 80mm ${pageHeightMm}mm; margin: 0; }
        @media print {
          html, body { width: 80mm; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .print-controls { display: none !important; }
          .thermal-receipt { width: 80mm !important; min-height: 0 !important; margin: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="print-controls mx-auto mb-4 flex max-w-[80mm] gap-2">
        <Link href={`/pedidos/${order.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600"><ArrowLeft size={16} /> Voltar</Link>
        <button onClick={() => window.print()} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--yellow)] px-3 text-sm font-extrabold text-[var(--purple-dark)]"><Printer size={16} /> Imprimir via</button>
      </div>

      <article ref={receiptRef} className="thermal-receipt mx-auto w-[80mm] max-w-full bg-white px-[4mm] py-[5mm] font-mono text-[11px] leading-[1.35] shadow-[0_12px_35px_rgba(15,23,42,.12)]">
        <header className="text-center">
          <h1 className="text-[17px] font-black uppercase">Sorveteria da Manu</h1>
          <p className="mt-1 text-[10px] uppercase tracking-wider">Via do cliente</p>
          <p className="mt-3 text-[16px] font-black">{formatPublicOrderCode(order)}</p>
          <p className="mt-1">{formatDateTime(order.createdAt)}</p>
        </header>

        <div className="my-4 border-t border-dashed border-black" />

        <section className="grid gap-1">
          <p><strong>Cliente:</strong> {order.customerName}</p>
          {order.phone && <p><strong>Telefone:</strong> {order.phone}</p>}
          <p><strong>Tipo:</strong> {order.deliveryType === "delivery" ? "Entrega" : "Retirada"}</p>
          {order.address && <p className="break-words"><strong>Endereço:</strong> {order.address}</p>}
          <p><strong>Pagamento:</strong> {paymentLabels[order.paymentMethod]}</p>
          <p><strong>Situação:</strong> {order.paymentStatus === "paid" ? "Pago" : "Pendente"}</p>
        </section>

        <div className="my-4 border-t border-dashed border-black" />

        <section>
          <h2 className="mb-2 text-center text-[12px] font-black uppercase">Itens do pedido</h2>
          <div className="grid gap-3">
            {order.items.map((item) => (
              <div key={item.id}>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <strong className="min-w-0 break-words">{item.quantity}× {item.productName}</strong>
                  <strong>{formatCurrency(item.quantity * item.unitPrice)}</strong>
                </div>
                <p className="mt-0.5 text-[9px]">{formatCurrency(item.unitPrice)} cada</p>
                {getOrderItemDetails(item).map((detail) => <p key={detail} className="mt-0.5 break-words text-[9px]">{detail}</p>)}
              </div>
            ))}
          </div>
        </section>

        <div className="my-4 border-t border-dashed border-black" />

        {!!order.deliveryFee && <div className="mb-2 flex items-center justify-between"><span>Taxa de entrega</span><strong>{formatCurrency(order.deliveryFee)}</strong></div>}
        <div className="flex items-center justify-between text-[15px] font-black">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>

        {order.notes && (
          <>
            <div className="my-4 border-t border-dashed border-black" />
            <p className="break-words"><strong>Observações:</strong> {order.notes}</p>
          </>
        )}

        <footer className="mt-6 border-t border-dashed border-black pt-4 text-center">
          <p className="font-bold">Obrigado pela preferência!</p>
          <p className="mt-1 text-[9px]">Guarde esta via para conferência.</p>
          <p className="mt-4 text-[9px]">Pedido: {order.id.slice(0, 8).toUpperCase()}</p>
        </footer>
      </article>
    </main>
  );
}
