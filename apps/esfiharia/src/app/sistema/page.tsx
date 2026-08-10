"use client";
import Link from "next/link";
import { useOrders } from "@/components/orders-provider";
import { useStore } from "@/components/store-provider";
import { formatMoney } from "@/lib/format";
export default function Dashboard() {
  const { orders, loading, error } = useOrders();
  const { snapshot } = useStore();
  const active = orders.filter((order) =>
    ["new", "preparing", "ready"].includes(order.orderStatus),
  );
  const pending = orders.filter(
    (order) =>
      order.paymentStatus === "pending" && order.orderStatus !== "canceled",
  );
  const today = new Date().toDateString();
  const revenue = orders
    .filter(
      (order) =>
        order.paymentStatus === "paid" &&
        order.orderStatus !== "canceled" &&
        new Date(order.createdAt).toDateString() === today,
    )
    .reduce((sum, order) => sum + order.total, 0);
  return (
    <main className="admin-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1>Painel</h1>
          <p className="muted">Acompanhamento exclusivo da Esfiharia.</p>
        </div>
        <Link className="btn" href="/pedidos/novo">
          Novo pedido
        </Link>
      </div>
      {!snapshot?.store.active && (
        <div className="notice">Loja ainda não ativada.</div>
      )}
      {error && <div className="notice">{error}</div>}
      <div className="stats">
        <div className="stat">
          <span>Na fila</span>
          <strong>{loading ? "—" : active.length}</strong>
        </div>
        <div className="stat">
          <span>A cobrar</span>
          <strong>{pending.length}</strong>
        </div>
        <div className="stat">
          <span>Pedidos hoje</span>
          <strong>
            {
              orders.filter(
                (order) => new Date(order.createdAt).toDateString() === today,
              ).length
            }
          </strong>
        </div>
        <div className="stat">
          <span>Recebido hoje</span>
          <strong>{formatMoney(revenue)}</strong>
        </div>
      </div>
      <section className="panel">
        <h2>Pedidos recentes</h2>
        {!active.length ? (
          <div className="empty">
            <h3>Nenhum pedido na fila</h3>
            <p className="muted">Novos pedidos da Esfiharia aparecerão aqui.</p>
          </div>
        ) : (
          <div className="order-grid">
            {active.slice(0, 4).map((order) => (
              <Link
                href={`/pedidos/${order.id}`}
                className="order-card"
                key={order.id}
              >
                <header>
                  <strong>{order.customerName}</strong>
                  <span className="badge">{order.publicCode}</span>
                </header>
                <p>
                  {order.items
                    .map((item) => `${item.quantity}x ${item.productName}`)
                    .join(", ")}
                </p>
                <strong>{formatMoney(order.total)}</strong>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
