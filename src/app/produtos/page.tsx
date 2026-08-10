"use client";

import { FormEvent, useState } from "react";
import { Edit3, Package, Plus, Search, Trash2, X } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { Product, ProductCategory } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const categories: ProductCategory[] = ["Açaí", "Sorvetes", "Milk-shakes", "Sobremesas", "Promoções", "Bebidas", "Outros"];

export default function ProductsPage() {
  const { products, saveProduct, deleteProduct, dataError } = useStore();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const visible = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback("");
    const data = new FormData(event.currentTarget);
    const saved = await saveProduct({
      id: editing?.id,
      name: String(data.get("name")),
      category: data.get("category") as ProductCategory,
      price: Math.max(0, Number(String(data.get("price")).replace(",", ".")) || 0),
      active: data.get("active") === "on",
      availableToday: data.get("availableToday") === "on",
      featured: data.get("featured") === "on",
      displayOrder: Number(data.get("displayOrder")) || 0,
    });
    setSaving(false);
    if (saved) {
      setEditing(undefined);
      setFeedback("Produto salvo com sucesso.");
    }
  }

  return <div className="grid min-w-0 max-w-full gap-6 overflow-x-clip">
    <div className="flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-[var(--text)]">Cardápio</h2>
        <p className="text-sm font-normal text-[var(--muted)]">Produtos disponíveis no caixa.</p>
      </div>
      <Button className="w-full sm:w-auto" onClick={() => setEditing(null)}>
        <Plus size={18} /> Adicionar produto
      </Button>
    </div>
    {(dataError || feedback) && <p role="status" className={`rounded-xl p-3 text-sm ${dataError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{dataError || feedback}</p>}
    <div className="relative min-w-0 max-w-xl">
      <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-11" />
    </div>
    <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {!visible.length && <p className="text-sm text-[var(--muted)]">Nenhum produto encontrado.</p>}
      {visible.map((product) => <Card key={product.id} className="internal-metric group min-w-0 overflow-hidden p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:flex-1 sm:gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,#f6edf7,#fff5dd)] text-[var(--purple)] transition group-hover:scale-105"><Package size={22} /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[var(--text)]">{product.name}</p>
              <p className="text-sm text-[var(--muted)]">{product.category}</p>
              <p className="mt-1 font-bold text-[var(--text)]">{formatCurrency(product.price)}</p>
            </div>
          </div>
          <div className="grid min-w-0 gap-2 sm:justify-items-end">
            <div className="flex min-w-0 flex-wrap gap-1 sm:justify-end">
              <span className={`max-w-full rounded-full px-2 py-1 text-xs font-bold leading-tight ${product.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{product.active ? "Ativo" : "Inativo"}</span>
              <span className={`max-w-full rounded-full px-2 py-1 text-xs font-bold leading-tight ${product.availableToday ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>{product.availableToday ? "Disponível hoje" : "Indisponível hoje"}</span>
              {product.featured && <span className="max-w-full rounded-full bg-purple-100 px-2 py-1 text-xs font-bold leading-tight text-purple-700">Destaque</span>}
            </div>
            <div className="flex justify-end gap-1">
              <button aria-label={`Editar ${product.name}`} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-purple-50 hover:text-purple-700" onClick={() => setEditing(product)}><Edit3 size={17} /></button>
              <button aria-label={`Excluir ${product.name}`} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-700" onClick={() => confirm("Deseja excluir este produto?") && deleteProduct(product.id)}><Trash2 size={17} /></button>
            </div>
          </div>
        </div>
      </Card>)}
    </div>
    {editing !== undefined && <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-0 sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && setEditing(undefined)}>
      <form onSubmit={submit} className="max-h-[calc(100svh-1rem)] w-full max-w-[calc(100vw-1rem)] overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-white p-5 shadow-[0_16px_48px_rgba(22,5,31,.14)] sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-bold">{editing ? "Editar produto" : "Novo produto"}</h3><button type="button" aria-label="Fechar" onClick={() => setEditing(undefined)}><X /></button></div>
        <div className="grid gap-4"><Field label="Nome do produto"><Input name="name" required defaultValue={editing?.name} placeholder="Ex.: Açaí 300 ml" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Categoria"><Select name="category" defaultValue={editing?.category}>{categories.map((category) => <option key={category}>{category}</option>)}</Select></Field><Field label="Preço"><Input name="price" inputMode="decimal" required defaultValue={editing?.price} placeholder="0,00" /></Field></div><Field label="Ordem de exibição"><Input name="displayOrder" type="number" min="0" defaultValue={editing?.displayOrder ?? products.length + 1} /></Field><div className="grid gap-3 sm:grid-cols-3"><label className="flex items-center gap-3 font-semibold"><input className="h-5 w-5 accent-[var(--purple)]" name="active" type="checkbox" defaultChecked={editing?.active ?? true} /> Ativo</label><label className="flex items-center gap-3 font-semibold"><input className="h-5 w-5 accent-[var(--purple)]" name="availableToday" type="checkbox" defaultChecked={editing?.availableToday ?? true} /> Disponível hoje</label><label className="flex items-center gap-3 font-semibold"><input className="h-5 w-5 accent-[var(--purple)]" name="featured" type="checkbox" defaultChecked={editing?.featured ?? false} /> Destaque</label></div><Button className="mt-2 w-full" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar produto"}</Button></div>
      </form>
    </div>}
  </div>;
}
