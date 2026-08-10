"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrders } from "@/components/orders-provider";
import { formatMoney } from "@/lib/format";
export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { orders, updateStatus, updatePayment, cancel } = useOrders();
  const order = orders.find((item) => item.id === id);
  if (!order)
    return (
      <main className="admin-content">
        <div className="empty">
          <h1>Pedido não encontrado</h1>
          <p className="muted">
            O pedido pode pertencer a outra loja ou não existir.
          </p>
          <Link className="btn" href="/pedidos">
            Voltar
          </Link>
        </div>
      </main>
    );
  return (
    <main className="admin-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{order.publicCode}</span>
          <h1>{order.customerName}</h1>
          <p className="muted">
            {order.deliveryType === "delivery"
              ? order.address || "Entrega"
              : "Retirada na loja"}
          </p>
        </div>
        <span className="badge">{order.orderStatus}</span>
      </div>
      <section className="panel">
        <h2>Itens</h2>
        {order.items.map((item) => (
          <div className="cart-item" key={item.id}>
            <div className="total-row">
              <span>
                {item.quantity}x {item.productName}
              </span>
              <strong>{formatMoney(item.subtotal)}</strong>
            </div>
            {item.notes && <p className="muted">{item.notes}</p>}
          </div>
        ))}
        <div className="total-row">
          <span>Subtotal</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
        <div className="total-row">
          <span>Taxa</span>
          <span>{formatMoney(order.deliveryFee)}</span>
        </div>
        <div className="total-row grand">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
        <p>
          {order.paymentMethod} •{" "}
          {order.paymentStatus === "paid" ? "Pago" : "Pendente"}
        </p>
        <div className="actions">
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
          {order.paymentStatus === "pending" && (
            <button
              className="btn secondary"
              onClick={() => updatePayment(order.id, "paid")}
            >
              Marcar como pago
            </button>
          )}
          {!["delivered", "canceled"].includes(order.orderStatus) && (
            <button className="btn secondary" onClick={() => cancel(order.id)}>
              Cancelar
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
