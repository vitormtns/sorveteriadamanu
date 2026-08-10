"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useStore } from "@/components/store-provider";
import { formatMoney } from "@/lib/format";
import { Product } from "@/lib/types";
const empty = {
  name: "",
  category: "Outros",
  description: "",
  price: "",
  active: true,
  availableToday: true,
  featured: false,
  displayOrder: "0",
  imageUrl: "",
};
export default function ProductsPage() {
  const { snapshot } = useStore();
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!client || !snapshot?.store.active) return;
    const { data, error: loadError } = await client
      .from("products")
      .select("*")
      .eq("store_id", snapshot.store.id)
      .order("display_order");
    if (loadError) {
      setError("Não foi possível carregar os produtos.");
      return;
    }
    setProducts(
      (data ?? []).map((row) => ({
        id: row.id,
        storeId: row.store_id,
        name: row.name,
        category: row.category,
        description: row.description ?? undefined,
        price: Number(row.price),
        active: row.active,
        availableToday: row.available_today,
        featured: row.featured,
        displayOrder: row.display_order,
        imageUrl: row.image_url ?? undefined,
      })),
    );
  }, [client, snapshot]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!client || !snapshot) return;
    const row = {
      store_id: snapshot.store.id,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      price: Number(form.price),
      active: form.active,
      available_today: form.availableToday,
      featured: form.featured,
      display_order: Number(form.displayOrder),
      image_url: form.imageUrl.trim() || null,
    };
    const result = editing
      ? await client
          .from("products")
          .update(row)
          .eq("id", editing)
          .eq("store_id", snapshot.store.id)
      : await client.from("products").insert(row);
    if (result.error) {
      setError("Não foi possível salvar o produto.");
      return;
    }
    setEditing(null);
    setForm(empty);
    setError("");
    await load();
  }
  function edit(product: Product) {
    setEditing(product.id);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description ?? "",
      price: String(product.price),
      active: product.active,
      availableToday: product.availableToday,
      featured: product.featured,
      displayOrder: String(product.displayOrder),
      imageUrl: product.imageUrl ?? "",
    });
  }
  async function toggle(
    product: Product,
    key: "active" | "available_today",
    value: boolean,
  ) {
    await client
      ?.from("products")
      .update({ [key]: value })
      .eq("id", product.id)
      .eq("store_id", snapshot!.store.id);
    await load();
  }
  return (
    <main className="admin-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Cardápio</span>
          <h1>Produtos</h1>
          <p className="muted">Somente produtos vinculados à Esfiharia.</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="menu-layout">
        <section className="panel" style={{ marginTop: 0 }}>
          {!products.length ? (
            <div className="empty">
              <h2>Cardápio ainda não cadastrado</h2>
              <p className="muted">
                Cadastre o primeiro produto quando houver informações reais.
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Preço</th>
                  <th>Ativo</th>
                  <th>Hoje</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <br />
                      <small>{product.category}</small>
                    </td>
                    <td>{formatMoney(product.price)}</td>
                    <td>
                      <input
                        aria-label={`Ativar ${product.name}`}
                        type="checkbox"
                        checked={product.active}
                        onChange={(event) =>
                          void toggle(product, "active", event.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Disponibilizar ${product.name} hoje`}
                        type="checkbox"
                        checked={product.availableToday}
                        onChange={(event) =>
                          void toggle(
                            product,
                            "available_today",
                            event.target.checked,
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="btn secondary"
                        onClick={() => edit(product)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <aside className="cart-panel">
          <h2>{editing ? "Editar produto" : "Novo produto"}</h2>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="description">Descrição</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="price">Preço</label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="category">Categoria</label>
              <select
                id="category"
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                {["Outros", "Bebidas", "Promoções", "Sobremesas"].map(
                  (category) => (
                    <option key={category}>{category}</option>
                  ),
                )}
              </select>
            </div>
            <div className="field">
              <label htmlFor="order">Ordem</label>
              <input
                id="order"
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(event) =>
                  setForm({ ...form, displayOrder: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="image">URL da imagem (futura)</label>
              <input
                id="image"
                type="url"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm({ ...form, imageUrl: event.target.value })
                }
              />
            </div>
            <label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm({ ...form, active: event.target.checked })
                }
              />{" "}
              Ativo
            </label>
            <br />
            <label>
              <input
                type="checkbox"
                checked={form.availableToday}
                onChange={(event) =>
                  setForm({ ...form, availableToday: event.target.checked })
                }
              />{" "}
              Disponível hoje
            </label>
            <br />
            <label>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) =>
                  setForm({ ...form, featured: event.target.checked })
                }
              />{" "}
              Destaque
            </label>
            <div className="actions">
              <button className="btn">Salvar</button>
              {editing && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setEditing(null);
                    setForm(empty);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
}
