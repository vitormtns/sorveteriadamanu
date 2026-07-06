"use client";

import { FormEvent, useState } from "react";
import { Edit3, Package, Plus, Search, Trash2, X } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { Product, ProductCategory } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const categories: ProductCategory[] = ["Açaí", "Sorvetes", "Sobremesas", "Promoções", "Bebidas", "Outros"];

export default function ProductsPage() {
  const { products, saveProduct, deleteProduct } = useStore();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const visible = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    saveProduct({
      id: editing?.id,
      name: String(data.get("name")),
      category: data.get("category") as ProductCategory,
      price: Number(String(data.get("price")).replace(",", ".")),
      active: data.get("active") === "on",
    });
    setEditing(undefined);
  }

  return <div className="grid gap-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold text-[var(--text)]">Cardápio</h2><p className="text-sm font-normal text-[var(--muted)]">Produtos disponíveis no caixa.</p></div><Button onClick={() => setEditing(null)}><Plus size={18} /> Adicionar produto</Button></div>
    <div className="relative max-w-xl"><Search className="absolute left-4 top-3.5 text-slate-400" size={20} /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-11" /></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((product) => <Card key={product.id} className="internal-metric group flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,#f6edf7,#fff5dd)] text-[var(--purple)] transition group-hover:scale-105"><Package size={22} /></div>
        <div className="min-w-0 flex-1"><p className="truncate font-semibold text-[var(--text)]">{product.name}</p><p className="text-sm text-[var(--muted)]">{product.category}</p><p className="mt-1 font-bold text-[var(--text)]">{formatCurrency(product.price)}</p></div>
        <div className="grid justify-items-end gap-2"><span className={`rounded-full px-2 py-1 text-xs font-bold ${product.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{product.active ? "Ativo" : "Inativo"}</span><div><button aria-label={`Editar ${product.name}`} className="p-2 text-slate-500 hover:text-purple-700" onClick={() => setEditing(product)}><Edit3 size={17} /></button><button aria-label={`Excluir ${product.name}`} className="p-2 text-slate-500 hover:text-red-700" onClick={() => confirm("Deseja excluir este produto?") && deleteProduct(product.id)}><Trash2 size={17} /></button></div></div>
      </Card>)}
    </div>
    {editing !== undefined && <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 sm:place-items-center" onMouseDown={(e) => e.target === e.currentTarget && setEditing(undefined)}>
      <form onSubmit={submit} className="w-full max-w-lg rounded-t-2xl border border-[var(--border)] bg-white p-6 shadow-[0_16px_48px_rgba(22,5,31,.14)] sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-bold">{editing ? "Editar produto" : "Novo produto"}</h3><button type="button" aria-label="Fechar" onClick={() => setEditing(undefined)}><X /></button></div>
        <div className="grid gap-4"><Field label="Nome do produto"><Input name="name" required defaultValue={editing?.name} placeholder="Ex.: Açaí 300 ml" /></Field><Field label="Categoria"><Select name="category" defaultValue={editing?.category}>{categories.map((category) => <option key={category}>{category}</option>)}</Select></Field><Field label="Preço"><Input name="price" inputMode="decimal" required defaultValue={editing?.price} placeholder="0,00" /></Field><label className="flex items-center gap-3 font-semibold"><input className="h-5 w-5 accent-[var(--purple)]" name="active" type="checkbox" defaultChecked={editing?.active ?? true} /> Produto ativo</label><Button className="mt-2 w-full" type="submit">Salvar produto</Button></div>
      </form>
    </div>}
  </div>;
}
