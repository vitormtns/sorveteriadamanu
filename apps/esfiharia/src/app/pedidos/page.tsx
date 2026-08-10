"use client";
import Link from "next/link";
import { useState } from "react";
import { useOrders } from "@/components/orders-provider";
import { formatElapsed, formatMoney } from "@/lib/format";
import { Order } from "@/lib/types";
const tabs = [
  "Preparar",
  "Entregar",
  "Cobrar",
  "Todos",
  "Entregues",
  "Cancelados",
] as const;
export default function OrdersPage() {
  const { orders, loading, error, updateStatus, updatePayment } = useOrders();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Preparar");
  const filtered = orders.filter((order) => matches(order, tab));
  return (
    <main className="admin-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Operação</span>
          <h1>Pedidos</h1>
        </div>
        <Link className="btn" href="/pedidos/novo">
          Novo pedido
        </Link>
      </div>
      <div className="actions">
        {tabs.map((item) => (
          <button
            key={item}
            className={`btn ${tab === item ? "" : "secondary"}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {error && <div className="notice">{error}</div>}
      <section className="panel">
        {loading ? (
          <p>Carregando pedidos...</p>
        ) : !filtered.length ? (
          <div className="empty">
            <h2>Nenhum pedido nesta fila</h2>
            <p className="muted">
              A lista é filtrada somente para a Esfiharia.
            </p>
          </div>
        ) : (
          <div className="order-grid">
            {filtered.map((order) => (
              <article className="order-card" key={order.id}>
                <header>
                  <div>
                    <strong>{order.customerName}</strong>
                    <br />
                    <small className="muted">
                      {formatElapsed(order.createdAt)}
                    </small>
                  </div>
                  <span className="badge">
                    {order.deliveryType === "delivery" ? "Entrega" : "Retirada"}
                  </span>
                </header>
                <p>
                  {order.items.map((item) => (
                    <span key={item.id} style={{ display: "block" }}>
                      {item.quantity}x {item.productName}
                      {item.notes ? ` — ${item.notes}` : ""}
                    </span>
                  ))}
                </p>
                {order.notes && <p className="notice">{order.notes}</p>}
                <div className="total-row">
                  <span>
                    {order.paymentMethod} •{" "}
                    {order.paymentStatus === "paid" ? "Pago" : "Pendente"}
                  </span>
                  <strong>{formatMoney(order.total)}</strong>
                </div>
                <div className="actions">
                  <Link className="btn secondary" href={`/pedidos/${order.id}`}>
                    Detalhes
                  </Link>
                  {order.orderStatus === "new" && (
                    <button
                      className="btn"
                      onClick={() => updateStatus(order.id, "preparing")}
                    >
                      Preparar
                    </button>
                  )}
                  {order.orderStatus === "preparing" && (
                    <button
                      className="btn"
                      onClick={() => updateStatus(order.id, "ready")}
                    >
                      Marcar pronto
                    </button>
                  )}
                  {order.orderStatus === "ready" && (
                    <button
                      className="btn"
                      onClick={() => updateStatus(order.id, "delivered")}
                    >
                      Entregar
                    </button>
                  )}
                  {order.paymentStatus === "pending" &&
                    order.orderStatus !== "canceled" && (
                      <button
                        className="btn secondary"
                        onClick={() => updatePayment(order.id, "paid")}
                      >
                        Cobrar
                      </button>
                    )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
function matches(order: Order, tab: (typeof tabs)[number]) {
  if (tab === "Preparar")
    return ["new", "preparing"].includes(order.orderStatus);
  if (tab === "Entregar") return order.orderStatus === "ready";
  if (tab === "Cobrar")
    return (
      order.paymentStatus === "pending" && order.orderStatus !== "canceled"
    );
  if (tab === "Entregues") return order.orderStatus === "delivered";
  if (tab === "Cancelados") return order.orderStatus === "canceled";
  return true;
}
