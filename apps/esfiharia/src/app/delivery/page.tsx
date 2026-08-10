"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { formatMoney } from "@/lib/format";
import { DeliveryType, PaymentMethod, Product } from "@/lib/types";

export default function DeliveryPage() {
  const {
    snapshot,
    loading,
    error,
    cart,
    subtotal,
    addProduct,
    updateCart,
    removeProduct,
    clearCart,
  } = useStore();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("Todos");
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    deliveryType: "pickup" as DeliveryType,
    address: "",
    paymentMethod: "Pix" as PaymentMethod,
    notes: "",
  });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const products = useMemo(
    () => snapshot?.products ?? [],
    [snapshot?.products],
  );
  const categories = useMemo(
    () => ["Todos", ...new Set(products.map((product) => product.category))],
    [products],
  );
  const filtered =
    category === "Todos"
      ? products
      : products.filter((product) => product.category === category);
  const settings = snapshot?.settings;
  const fee =
    form.deliveryType === "delivery" ? (settings?.deliveryFee ?? 0) : 0;
  const canOrder = Boolean(
    snapshot?.store.active &&
      settings?.deliveryOpen &&
      !settings.paused &&
      !settings.closedToday,
  );

  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!canOrder || !cart.length || sending) return;
    setSending(true);
    setMessage("");
    const token = randomToken();
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          idempotencyKey: crypto.randomUUID(),
          trackingToken: token,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            notes: item.notes,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error?.message ?? "Não foi possível enviar o pedido.");
        return;
      }
      clearCart();
      location.href = `/acompanhar/${body.order.publicCode}?token=${encodeURIComponent(token)}`;
    } catch {
      setMessage("Não foi possível se conectar ao servidor.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="section">
      <div className="container">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Peça do seu jeito</span>
            <h1>Cardápio</h1>
            <p className="muted">
              Escolha o produto, a quantidade e deixe uma observação se
              precisar.
            </p>
          </div>
        </div>
        {loading && <div className="notice">Carregando cardápio...</div>}
        {error && <div className="notice">{error}</div>}
        {!canOrder && !loading && (
          <div className="notice">
            <strong>Pedidos indisponíveis.</strong>
            <br />
            {snapshot?.store.active
              ? settings?.closedMessage ||
                "A loja ainda não está pronta para receber pedidos."
              : "A Esfiharia ainda está em pré-lançamento."}
          </div>
        )}
        <div className="actions" aria-label="Categorias">
          {categories.map((item) => (
            <button
              className={`btn ${category === item ? "" : "secondary"}`}
              key={item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="menu-layout" style={{ marginTop: 24 }}>
          <section>
            {!filtered.length ? (
              <div className="empty">
                <ShoppingBag size={34} />
                <h2>Cardápio ainda não cadastrado</h2>
                <p className="muted">
                  Nenhum produto real foi publicado para a Esfiharia.
                </p>
              </div>
            ) : (
              <div className="product-grid">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantity={quantities[product.id] ?? 1}
                    setQuantity={(quantity) =>
                      setQuantities((current) => ({
                        ...current,
                        [product.id]: quantity,
                      }))
                    }
                    add={() => addProduct(product, quantities[product.id] ?? 1)}
                    disabled={!canOrder}
                  />
                ))}
              </div>
            )}
          </section>
          <aside className="cart-panel">
            <h2>Seu carrinho</h2>
            {!cart.length ? (
              <p className="muted">Seu carrinho está vazio.</p>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.product.id}>
                  <header>
                    <strong>{item.product.name}</strong>
                    <button
                      aria-label={`Remover ${item.product.name}`}
                      onClick={() => removeProduct(item.product.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </header>
                  <div className="total-row">
                    <div className="qty">
                      <button
                        aria-label="Diminuir quantidade"
                        onClick={() =>
                          item.quantity === 1
                            ? removeProduct(item.product.id)
                            : updateCart(item.product.id, item.quantity - 1)
                        }
                      >
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label="Aumentar quantidade"
                        onClick={() =>
                          updateCart(item.product.id, item.quantity + 1)
                        }
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <strong>
                      {formatMoney(item.product.price * item.quantity)}
                    </strong>
                  </div>
                  <textarea
                    aria-label={`Observação de ${item.product.name}`}
                    placeholder="Observação do item"
                    value={item.notes}
                    onChange={(event) =>
                      updateCart(
                        item.product.id,
                        item.quantity,
                        event.target.value,
                      )
                    }
                  />
                </div>
              ))
            )}
            {cart.length > 0 && (
              <form className="checkout" onSubmit={checkout}>
                <h3>Finalizar pedido</h3>
                <div className="field">
                  <label htmlFor="name">Nome</label>
                  <input
                    id="name"
                    required
                    minLength={2}
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
                    required
                    inputMode="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="type">Recebimento</label>
                  <select
                    id="type"
                    value={form.deliveryType}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        deliveryType: event.target.value as DeliveryType,
                      })
                    }
                  >
                    <option value="pickup" disabled={!settings?.allowPickup}>
                      Retirada
                    </option>
                    <option
                      value="delivery"
                      disabled={!settings?.allowDelivery}
                    >
                      Entrega
                    </option>
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
                    {(settings?.acceptedPaymentMethods ?? ["Pix"]).map(
                      (payment) => (
                        <option key={payment}>{payment}</option>
                      ),
                    )}
                  </select>
                </div>
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
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="total-row">
                  <span>Taxa</span>
                  <span>{formatMoney(fee)}</span>
                </div>
                <div className="total-row grand">
                  <span>Total</span>
                  <span>{formatMoney(subtotal + fee)}</span>
                </div>
                {message && (
                  <p className="notice" role="alert">
                    {message}
                  </p>
                )}
                <button
                  className="btn"
                  style={{ width: "100%", marginTop: 14 }}
                  disabled={!canOrder || sending}
                >
                  {sending ? "Enviando..." : "Enviar pedido"}
                </button>
              </form>
            )}
          </aside>
        </div>
        <p style={{ marginTop: 32 }}>
          <Link href="/" className="muted">
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}

function ProductCard({
  product,
  quantity,
  setQuantity,
  add,
  disabled,
}: {
  product: Product;
  quantity: number;
  setQuantity: (value: number) => void;
  add: () => void;
  disabled: boolean;
}) {
  return (
    <article className="product-card">
      <span className="eyebrow">{product.category}</span>
      <h3>{product.name}</h3>
      <p className="muted">
        {product.description || "Descrição ainda não informada."}
      </p>
      <span className="price">{formatMoney(product.price)}</span>
      <footer>
        <div className="qty">
          <button
            aria-label="Diminuir quantidade"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity === 1}
          >
            <Minus size={16} />
          </button>
          <span>{quantity}</span>
          <button
            aria-label="Aumentar quantidade"
            onClick={() => setQuantity(Math.min(20, quantity + 1))}
          >
            <Plus size={16} />
          </button>
        </div>
        <button className="btn" onClick={add} disabled={disabled}>
          Adicionar
        </button>
      </footer>
    </article>
  );
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
