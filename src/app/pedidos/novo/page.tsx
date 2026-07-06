"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Minus, Plus, Search, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store-provider";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { PaymentMethod, Product } from "@/lib/types";
import { formatCurrency, uid } from "@/lib/utils";

export default function NewOrderPage() {
  const router = useRouter();
  const { products, addOrder } = useStore();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [status, setStatus] = useState<"paid" | "pending_payment">("paid");
  const active = products.filter((p) => p.active && p.name.toLowerCase().includes(search.toLowerCase()));
  const selected = products.filter((p) => (quantities[p.id] || 0) > 0);
  const total = useMemo(() => selected.reduce((sum, p) => sum + p.price * quantities[p.id], 0), [selected, quantities]);

  function change(product: Product, amount: number) {
    setQuantities((current) => ({ ...current, [product.id]: Math.max(0, (current[product.id] || 0) + amount) }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length) return;
    const data = new FormData(event.currentTarget);
    const id = addOrder({
      customerName: String(data.get("customerName")),
      phone: String(data.get("phone") || ""),
      notes: String(data.get("notes") || ""),
      paymentMethod, status, total,
      items: selected.map((product) => ({ id: uid(), productId: product.id, productName: product.name, quantity: quantities[product.id], unitPrice: product.price })),
    });
    router.push(`/pedidos/${id}?criado=1`);
  }

  return <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1fr_380px]">
    <div className="grid gap-5">
      <Card><h2 className="mb-4 text-lg font-bold">Cliente</h2><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do cliente"><Input name="customerName" required placeholder="Quem está pedindo?" /></Field><Field label="Telefone (opcional)"><Input name="phone" inputMode="tel" placeholder="(00) 00000-0000" /></Field></div></Card>
      <Card>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold">Escolha os produtos</h2><p className="text-sm font-normal text-[var(--muted)]">Toque em + para adicionar</p></div><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." /></div></div>
        <div className="grid gap-2 sm:grid-cols-2">
          {active.map((product) => { const quantity = quantities[product.id] || 0; return <div key={product.id} className={`flex items-center gap-3 rounded-xl border p-3 transition duration-200 ${quantity ? "border-[#b77bc0] bg-[linear-gradient(145deg,#faf3fb,#fffaf0)] shadow-[0_8px_24px_rgba(58,10,77,.06)]" : "border-[var(--border)] bg-white hover:border-[#d7bedb]"}`}>
            <button type="button" onClick={() => change(product, 1)} className="min-w-0 flex-1 text-left"><p className="truncate font-semibold text-[var(--text)]">{product.name}</p><p className="text-sm font-semibold text-[var(--purple)]">{formatCurrency(product.price)}</p></button>
            {quantity > 0 ? <div className="flex items-center gap-2"><button type="button" aria-label="Diminuir quantidade" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-white" onClick={() => change(product, -1)}><Minus size={16} /></button><span className="w-5 text-center font-semibold">{quantity}</span><button type="button" aria-label="Aumentar quantidade" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--purple)] text-white" onClick={() => change(product, 1)}><Plus size={16} /></button></div> : <button type="button" aria-label={`Adicionar ${product.name}`} className="grid h-10 w-10 place-items-center rounded-full bg-[#f2ebf4] text-[var(--purple)]" onClick={() => change(product, 1)}><Plus size={18} /></button>}
          </div>})}
        </div>
      </Card>
      <Card><Field label="Observações (opcional)"><Textarea name="notes" rows={3} placeholder="Ex.: sem banana, retirar às 16h..." /></Field></Card>
    </div>
    <aside className="grid content-start gap-5">
      <Card className="relative overflow-hidden xl:sticky xl:top-24">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#ff6fae] via-[var(--yellow)] to-[#4a0b63]" />
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingCart size={20} /> Resumo do pedido</h2>
        <div className="my-4 grid gap-2 border-y border-slate-100 py-4">{selected.length === 0 && <p className="text-sm text-slate-500">Nenhum produto adicionado.</p>}{selected.map((p) => <div key={p.id} className="flex justify-between text-sm"><span>{quantities[p.id]}× {p.name}</span><b>{formatCurrency(p.price * quantities[p.id])}</b></div>)}</div>
        <div className="mb-5 flex items-center justify-between"><span className="font-semibold">Total</span><span className="text-2xl font-bold tracking-[-0.02em] text-[var(--text)]">{formatCurrency(total)}</span></div>
        <div className="grid gap-4">
          <Field label="Forma de pagamento"><Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Fiado/Outro</option></Select></Field>
          <div><p className="mb-2 text-sm font-bold text-slate-700">Status do pagamento</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setStatus("paid")} className={`min-h-12 rounded-xl border font-bold ${status === "paid" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200"}`}>Pago</button><button type="button" onClick={() => setStatus("pending_payment")} className={`min-h-12 rounded-xl border font-bold ${status === "pending_payment" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200"}`}>Pendente</button></div></div>
          <Button type="submit" disabled={!selected.length} className="min-h-14 w-full text-base"><Check size={20} /> Salvar pedido</Button>
        </div>
      </Card>
    </aside>
  </form>;
}
