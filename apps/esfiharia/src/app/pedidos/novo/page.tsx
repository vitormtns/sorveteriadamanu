"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { formatMoney } from "@/lib/format";
import { DeliveryType, PaymentMethod } from "@/lib/types";
export default function NewOrderPage() {
  const { snapshot } = useStore();
  const router = useRouter();
  const [items, setItems] = useState<
    Record<string, { quantity: number; notes: string }>
  >({});
  const [form, setForm] = useState({
    customerName: "Balcão",
    phone: "",
    paymentMethod: "Dinheiro" as PaymentMethod,
    paymentStatus: "pending",
    deliveryType: "pickup" as DeliveryType,
    address: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const products = snapshot?.products ?? [];
  const selected = products.filter(
    (product) => items[product.id]?.quantity > 0,
  );
  const total = selected.reduce(
    (sum, product) => sum + product.price * items[product.id].quantity,
    0,
  );
  function quantity(id: string, value: number) {
    setItems((current) => ({
      ...current,
      [id]: {
        quantity: Math.max(0, Math.min(20, value)),
        notes: current[id]?.notes ?? "",
      },
    }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!snapshot || !selected.length) return;
    setSaving(true);
    setError("");
    const client = createBrowserSupabaseClient();
    const { data, error: rpcError } = await client!.rpc(
      "create_internal_order",
      {
        p_store_id: snapshot.store.id,
        p_customer_name: form.customerName,
        p_payment_method: form.paymentMethod,
        p_items: selected.map((product) => ({
          product_id: product.id,
          quantity: items[product.id].quantity,
          notes: items[product.id].notes,
          details: {},
        })),
        p_phone: form.phone || null,
        p_notes: form.notes || null,
        p_payment_status: form.paymentStatus,
        p_delivery_type: form.deliveryType,
        p_address: form.address || null,
        p_delivery_fee: 0,
        p_discount: 0,
      },
    );
    if (rpcError) {
      setError("Não foi possível criar o pedido.");
      setSaving(false);
      return;
    }
    router.push(`/pedidos/${data}`);
  }
  return (
    <main className="admin-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Balcão</span>
          <h1>Novo pedido</h1>
          <p className="muted">Fluxo simples, sem builders ou adicionais.</p>
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="menu-layout">
          <section>
            {!products.length ? (
              <div className="empty">
                <h2>Cardápio ainda não cadastrado</h2>
              </div>
            ) : (
              <div className="product-grid">
                {products.map((product) => {
                  const item = items[product.id] ?? { quantity: 0, notes: "" };
                  return (
                    <article className="product-card" key={product.id}>
                      <h3>{product.name}</h3>
                      <span className="price">
                        {formatMoney(product.price)}
                      </span>
                      <div className="qty">
                        <button
                          type="button"
                          aria-label="Diminuir"
                          onClick={() =>
                            quantity(product.id, item.quantity - 1)
                          }
                        >
                          <Minus size={16} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Aumentar"
                          onClick={() =>
                            quantity(product.id, item.quantity + 1)
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      {item.quantity > 0 && (
                        <textarea
                          className="input"
                          aria-label={`Observação de ${product.name}`}
                          placeholder="Observação"
                          value={item.notes}
                          onChange={(event) =>
                            setItems({
                              ...items,
                              [product.id]: {
                                ...item,
                                notes: event.target.value,
                              },
                            })
                          }
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          <aside className="cart-panel">
            <h2>Dados do pedido</h2>
            <div className="field">
              <label htmlFor="customer">Cliente</label>
              <input
                id="customer"
                required
                value={form.customerName}
                onChange={(event) =>
                  setForm({ ...form, customerName: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Telefone</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="payment">Pagamento</label>
              <select
                id="payment"
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm({
                    ...form,
                    paymentMethod: event.target.value as PaymentMethod,
                  })
                }
              >
                {["Pix", "Dinheiro", "Cartão", "A combinar"].map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="paid">Situação</label>
              <select
                id="paid"
                value={form.paymentStatus}
                onChange={(event) =>
                  setForm({ ...form, paymentStatus: event.target.value })
                }
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="delivery">Recebimento</label>
              <select
                id="delivery"
                value={form.deliveryType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    deliveryType: event.target.value as DeliveryType,
                  })
                }
              >
                <option value="pickup">Retirada</option>
                <option value="delivery">Entrega</option>
              </select>
            </div>
            {form.deliveryType === "delivery" && (
              <div className="field">
                <label htmlFor="address">Endereço</label>
                <textarea
                  id="address"
                  required
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="notes">Observação geral</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </div>
            <div className="total-row grand">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>
            {error && <p className="notice">{error}</p>}
            <button
              className="btn"
              style={{ width: "100%" }}
              disabled={!selected.length || saving}
            >
              {saving ? "Salvando..." : "Salvar pedido"}
            </button>
          </aside>
        </div>
      </form>
    </main>
  );
}
