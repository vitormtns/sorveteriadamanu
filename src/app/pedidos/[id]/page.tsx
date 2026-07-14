"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Banknote, CheckCircle2, ChefHat, MapPin, PackageCheck, Printer, Store, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useOrders } from "@/components/orders-provider";
import { Button, Card, Field, Select } from "@/components/ui";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { getOrderChecklist, getOrderIssues, getOrderItemDetails } from "@/lib/order-operational";
import { OrderStatus, OrderStatusHistoryEntry, PaymentStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { paymentLabels } from "@/lib/settings";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orders, updateOperationalStatus, updatePaymentStatus, cancelOrder, actioningOrderId, error, getOrderHistory } = useOrders();
  const order = orders.find((item) => item.id === id);
  const [history, setHistory] = useState<OrderStatusHistoryEntry[]>([]);

  useEffect(() => {
    if (!order) return;
    void getOrderHistory(id).then(setHistory);
  }, [getOrderHistory, id, order]);

  if (!order) return <Card><p className="font-bold">Pedido não encontrado.</p><Link className="mt-3 inline-block text-[var(--purple)]" href="/pedidos">Voltar aos pedidos</Link></Card>;

  const currentOrder = order;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const paymentStatus = data.get("paymentStatus") as PaymentStatus;
    const orderStatus = data.get("orderStatus") as OrderStatus;
    if (paymentStatus !== currentOrder.paymentStatus) await updatePaymentStatus(id, paymentStatus);
    if (orderStatus !== currentOrder.orderStatus && orderStatus !== "canceled") await updateOperationalStatus(id, orderStatus);
    router.push("/pedidos");
  }

  const isCanceled = order.orderStatus === "canceled";
  const issues = getOrderIssues(order);
  const checklist = getOrderChecklist(order);

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
            {order.phone ? <a href={`tel:${order.phone}`} className="mt-1 block text-sm font-semibold text-[var(--purple)]">{order.phone}</a> : <p className="mt-1 text-sm font-bold text-amber-700">Telefone não informado</p>}
          </div>
          <div className="sm:text-right">
            <p className="font-semibold">{formatDateTime(order.createdAt)}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{paymentLabels[order.paymentMethod]}</p>
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
          {order.deliveryType === "delivery" && (
            <p className={`text-sm sm:col-span-2 ${order.address ? "text-slate-600" : "font-bold text-amber-800"}`}><strong>Endereço:</strong> {order.address || "Não informado"}</p>
          )}
          {order.deliveryType === "delivery" && (
            <p className="text-sm text-slate-600 sm:col-span-2"><strong>Taxa de entrega:</strong> {formatCurrency(order.deliveryFee ?? 0)}</p>
          )}
        </div>
      </Card>

      {(issues.length > 0 || checklist.length > 0) && (
        <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
          <Card className="p-4 md:p-5">
            <h3 className="font-extrabold">Alertas do pedido</h3>
            {issues.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {issues.map((issue) => (
                  <span key={issue.label} className={`rounded-lg border px-2.5 py-1.5 text-xs font-extrabold ${issue.tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                    {issue.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Informações principais conferidas.</p>
            )}
          </Card>
          <Card className="p-4 md:p-5">
            <h3 className="font-extrabold">Checklist do pedido</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {checklist.map((item) => (
                <span key={item.label} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${item.ok ? item.tone === "neutral" ? "bg-violet-50 text-[#6d2779]" : "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                  {item.label}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {!isCanceled && (
        <Card className="p-4 md:p-5">
          <h3 className="font-extrabold">Ações rápidas</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
            {order.paymentStatus === "pending" && <Button disabled={actioningOrderId === id} onClick={() => void updatePaymentStatus(id, "paid")}><Banknote size={17} /> Marcar como pago</Button>}
            {order.orderStatus === "new" && <Button disabled={actioningOrderId === id} variant="secondary" onClick={() => void updateOperationalStatus(id, "preparing")}><ChefHat size={17} /> Iniciar preparo</Button>}
            {order.orderStatus === "preparing" && <Button disabled={actioningOrderId === id} variant="secondary" onClick={() => void updateOperationalStatus(id, "ready")}><CheckCircle2 size={17} /> Marcar pronto</Button>}
            {order.orderStatus === "ready" && <Button disabled={actioningOrderId === id} variant="secondary" onClick={() => void updateOperationalStatus(id, "delivered")}>{order.deliveryType === "delivery" ? <Truck size={17} /> : <PackageCheck size={17} />} {order.deliveryType === "delivery" ? "Finalizar entrega" : "Finalizar retirada"}</Button>}
          </div>
        </Card>
      )}

      <Card className="p-4 md:p-5">
        <h3 className="font-extrabold">Histórico operacional</h3>
        {history.length ? <ol className="mt-3 grid gap-2">{history.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span><strong>{statusLabel(entry.newStatus)}</strong>{entry.previousStatus ? ` (antes: ${statusLabel(entry.previousStatus)})` : ""}{entry.notes ? ` · ${entry.notes}` : ""}</span><time className="text-xs text-[var(--muted)]">{formatDateTime(entry.createdAt)}</time></li>)}</ol> : <p className="mt-3 text-sm text-[var(--muted)]">Nenhuma mudança operacional registrada.</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-4 md:p-5">
          <h3 className="mb-3 font-extrabold">Itens do pedido</h3>
          <div className="divide-y divide-slate-100">
            {order.items.map((item) => {
              const details = getOrderItemDetails(item);
              return (
                <div className="flex justify-between gap-3 py-3" key={item.id}>
                  <div className="min-w-0">
                    <p className="font-semibold">{item.productName.split(/\s(?:—|-|·)\s/)[0]}</p>
                    {details.length > 0 && <p className="mt-1 text-xs leading-relaxed text-slate-500">{details.join(" · ")}</p>}
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <b className="shrink-0 font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</b>
                </div>
              );
            })}
          </div>
          {order.deliveryType === "delivery" && <div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]"><span>Taxa de entrega</span><strong>{formatCurrency(order.deliveryFee ?? 0)}</strong></div>}
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
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">As observações são preservadas como registro do pedido e não podem ser alteradas nesta etapa.</p>
            <Button type="submit">Salvar alterações</Button>
            {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
            {!isCanceled && (
              <Button type="button" variant="danger" onClick={() => {
                if (confirm("Deseja cancelar este pedido?")) {
                  void cancelOrder(id, "Cancelado pela equipe").then((done) => { if (done) router.push("/pedidos"); });
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

function statusLabel(status: OrderStatus) {
  return { new: "Recebido", preparing: "Em preparo", ready: "Pronto", delivered: "Entregue", canceled: "Cancelado" }[status];
}
