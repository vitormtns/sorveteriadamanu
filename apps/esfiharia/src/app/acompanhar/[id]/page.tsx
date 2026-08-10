"use client";

import Link from "next/link";
import { Check, ChefHat, Clock3, PackageCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

interface TrackingOrder {
  publicCode: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryType: string;
  subtotal: number | string;
  deliveryFee: number | string;
  total: number | string;
  createdAt: string;
  items: { name: string; quantity: number; subtotal: number | string }[];
}
const steps = [
  { key: "new", label: "Pedido recebido", icon: Clock3 },
  { key: "preparing", label: "Em preparo", icon: ChefHat },
  { key: "ready", label: "Pronto", icon: PackageCheck },
  { key: "delivered", label: "Concluído", icon: Check },
];

export default function TrackingPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [message, setMessage] = useState("Consultando seu pedido...");
  useEffect(() => {
    const token = new URLSearchParams(location.search).get("token") ?? "";
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/orders/tracking?code=${encodeURIComponent(params.id)}&token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const body = await response.json();
        if (!response.ok) {
          setMessage(body.error?.message ?? "Pedido não encontrado.");
          return;
        }
        setOrder(body.order);
        setMessage("");
        if (!["delivered", "canceled"].includes(body.order.orderStatus))
          timer = setTimeout(load, 8000);
      } catch {
        setMessage("Não foi possível atualizar o acompanhamento.");
      }
    };
    void load();
    return () => clearTimeout(timer);
  }, [params.id]);
  const current = order
    ? steps.findIndex((step) => step.key === order.orderStatus)
    : -1;
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <span className="eyebrow">Acompanhamento</span>
        <h1>Seu pedido</h1>
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
        {order && (
          <>
            <div className="panel">
              <div className="page-heading">
                <div>
                  <span className="muted">Código</span>
                  <h2>{order.publicCode}</h2>
                </div>
                <span className="badge">
                  {order.orderStatus === "canceled"
                    ? "Cancelado"
                    : order.deliveryType === "delivery"
                      ? "Entrega"
                      : "Retirada"}
                </span>
              </div>
              {order.orderStatus === "canceled" ? (
                <div className="notice">
                  Este pedido foi cancelado. Entre em contato com a loja se
                  precisar de ajuda.
                </div>
              ) : (
                <div className="feature-grid">
                  {steps.map(({ key, label, icon: Icon }, index) => (
                    <div
                      className="feature-card"
                      key={key}
                      style={{ opacity: index <= current ? 1 : 0.45 }}
                    >
                      <Icon />
                      <strong>{label}</strong>
                    </div>
                  ))}
                </div>
              )}
              <h3 style={{ marginTop: 28 }}>Itens</h3>
              {order.items.map((item, index) => (
                <div className="total-row" key={`${item.name}-${index}`}>
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>{formatMoney(Number(item.subtotal))}</span>
                </div>
              ))}
              <div className="total-row grand">
                <span>Total</span>
                <span>{formatMoney(Number(order.total))}</span>
              </div>
              <p className="muted">
                Pagamento: {order.paymentMethod} •{" "}
                {order.paymentStatus === "paid" ? "pago" : "pendente"}
              </p>
            </div>
            <div className="actions">
              <Link href="/delivery" className="btn">
                Fazer outro pedido
              </Link>
              <Link href="/" className="btn secondary">
                Voltar ao início
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
