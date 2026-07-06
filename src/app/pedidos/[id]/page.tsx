"use client";

import { FormEvent } from "react";
import { ArrowLeft, Banknote, CheckCircle2, ChefHat, MapPin, PackageCheck, Printer, Store, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/components/store-provider";
import { Button, Card, Field, Select, Textarea } from "@/components/ui";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { OrderStatus, PaymentStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orders, updateOrder } = useStore();
  const order = orders.find((item) => item.id === id);

  if (!order) return <Card><p className="font-bold">Pedido não encontrado.</p><Link className="mt-3 inline-block text-[var(--purple)]" href="/pedidos">Voltar aos pedidos</Link></Card>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateOrder(id, {
      paymentStatus: data.get("paymentStatus") as PaymentStatus,
      orderStatus: data.get("orderStatus") as OrderStatus,
      notes: String(data.get("notes") || ""),
    });
    router.push("/pedidos");
  }

  const isCanceled = order.orderStatus === "canceled";

  return (
    <div className="mx-auto grid max-w-5xl gap-4 md:gap-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/pedidos" className="flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={18} /> Voltar</Link>
        <div className="flex items-center gap-1.5">
          <Link href={`/pedidos/${order.id}/imprimir`} aria-label="Imprimir via do cliente" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-[#ccb6d0] hover:text-[var(--purple)]"><Printer size={15} /><span className="hidden sm:inline">Imprimir</span></Link>
          <PaymentStatusBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.orderStatus} />
        </div>
      </div>

      <Card className="relative overflow-hidden p-4 md:p-5">
        <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#ff6fae] to-[var(--yellow)]" />
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--muted)]">Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-.035em] text-[var(--text)]">{order.customerName}</h2>
            {order.phone && <a href={`tel:${order.phone}`} className="mt-1 block text-sm font-semibold text-[var(--purple)]">{order.phone}</a>}
          </div>
          <div className="sm:text-right">
            <p className="font-semibold">{formatDateTime(order.createdAt)}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{order.paymentMethod}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            {order.origin === "delivery" ? <Truck size={17} className="text-[var(--purple)]" /> : <Store size={17} className="text-[var(--purple)]" />}
            <span><strong>Origem:</strong> {order.origin === "delivery" ? "Pedido online" : "Balcão"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {order.deliveryType === "delivery" ? <MapPin size={17} className="text-[var(--purple)]" /> : <PackageCheck size={17} className="text-[var(--purple)]" />}
            <span><strong>Tipo:</strong> {order.deliveryType === "delivery" ? "Entrega" : "Retirada"}</span>
          </div>
          {order.deliveryType === "delivery" && order.address && (
            <p className="text-sm text-slate-600 sm:col-span-2"><strong>Endereço:</strong> {order.address}</p>
          )}
        </div>
      </Card>

      {!isCanceled && (
        <Card className="p-4 md:p-5">
          <h3 className="font-extrabold">Ações rápidas</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
            {order.paymentStatus === "pending" && <Button onClick={() => updateOrder(id, { paymentStatus: "paid" })}><Banknote size={17} /> Marcar como pago</Button>}
            {order.orderStatus === "new" && <Button variant="secondary" onClick={() => updateOrder(id, { orderStatus: "preparing" })}><ChefHat size={17} /> Iniciar preparo</Button>}
            {order.orderStatus === "preparing" && <Button variant="secondary" onClick={() => updateOrder(id, { orderStatus: "ready" })}><CheckCircle2 size={17} /> Marcar pronto</Button>}
            {order.orderStatus === "ready" && <Button variant="secondary" onClick={() => updateOrder(id, { orderStatus: "delivered" })}><Truck size={17} /> Finalizar entrega</Button>}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-4 md:p-5">
          <h3 className="mb-3 font-extrabold">Itens do pedido</h3>
          <div className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <div className="flex justify-between gap-3 py-3" key={item.id}>
                <div><p className="font-semibold">{item.productName}</p><p className="text-sm text-[var(--muted)]">{item.quantity} × {formatCurrency(item.unitPrice)}</p></div>
                <b className="font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</b>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-[var(--border)] pt-4 text-xl font-extrabold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
        </Card>

        <form onSubmit={submit}>
          <Card className="grid gap-4 p-4 md:p-5">
            <h3 className="font-extrabold">Editar pedido</h3>
            <Field label="Status do pagamento">
              <Select name="paymentStatus" defaultValue={order.paymentStatus}>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
              </Select>
            </Field>
            <Field label="Status operacional">
              <Select name="orderStatus" defaultValue={order.orderStatus}>
                <option value="new">Novo</option>
                <option value="preparing">Em preparo</option>
                <option value="ready">Pronto</option>
                <option value="delivered">Entregue</option>
                <option value="canceled">Cancelado</option>
              </Select>
            </Field>
            <Field label="Observações">
              <Textarea name="notes" defaultValue={order.notes} rows={4} placeholder="Nenhuma observação" />
            </Field>
            <Button type="submit">Salvar alterações</Button>
            {!isCanceled && (
              <Button type="button" variant="danger" onClick={() => {
                if (confirm("Deseja cancelar este pedido?")) {
                  updateOrder(id, { orderStatus: "canceled" });
                  router.push("/pedidos");
                }
              }}>
                <XCircle size={18} /> Cancelar pedido
              </Button>
            )}
          </Card>
        </form>
      </div>
    </div>
  );
}
