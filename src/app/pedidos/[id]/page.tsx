"use client";

import { FormEvent } from "react";
import { ArrowLeft, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/components/store-provider";
import { Button, Card, Field, Select, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { OrderStatus } from "@/lib/types";
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
    updateOrder(id, { status: data.get("status") as OrderStatus, notes: String(data.get("notes") || "") });
    router.push("/pedidos");
  }

  return <div className="mx-auto grid max-w-4xl gap-5">
    <div className="flex items-center justify-between gap-3"><Link href="/pedidos" className="flex items-center gap-2 font-bold text-slate-600"><ArrowLeft size={18} /> Voltar</Link><StatusBadge status={order.status} /></div>
    <Card><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-sm text-[var(--muted)]">Cliente</p><h2 className="text-2xl font-bold text-[var(--text)]">{order.customerName}</h2>{order.phone && <a href={`tel:${order.phone}`} className="mt-1 block text-[var(--purple)]">{order.phone}</a>}</div><div className="sm:text-right"><p className="text-sm text-[var(--muted)]">Criado em</p><p className="font-semibold">{formatDateTime(order.createdAt)}</p><p className="mt-1 text-sm">{order.paymentMethod}</p></div></div></Card>
    <Card><h3 className="mb-4 font-bold">Itens do pedido</h3><div className="divide-y divide-slate-100">{order.items.map((item) => <div className="flex justify-between gap-3 py-3" key={item.id}><div><p className="font-semibold">{item.productName}</p><p className="text-sm text-[var(--muted)]">{item.quantity} × {formatCurrency(item.unitPrice)}</p></div><b className="font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</b></div>)}</div><div className="mt-3 flex justify-between border-t border-[var(--border)] pt-4 text-xl font-bold"><span>Total</span><span>{formatCurrency(order.total)}</span></div></Card>
    <form onSubmit={submit}><Card className="grid gap-4"><h3 className="font-bold">Editar pedido</h3><Field label="Status do pagamento"><Select name="status" defaultValue={order.status}><option value="pending_payment">Pendente</option><option value="paid">Pago</option><option value="canceled">Cancelado</option></Select></Field><Field label="Observações"><Textarea name="notes" defaultValue={order.notes} rows={3} placeholder="Nenhuma observação" /></Field><div className="grid gap-2 sm:grid-cols-2"><Button type="submit">Salvar alterações</Button>{order.status !== "canceled" && <Button type="button" variant="danger" onClick={() => { if (confirm("Deseja cancelar este pedido?")) { updateOrder(id, { status: "canceled" }); router.push("/pedidos"); } }}><XCircle size={18} /> Cancelar pedido</Button>}</div></Card></form>
  </div>;
}
