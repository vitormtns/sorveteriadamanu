import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStoreSlug } from "@/lib/store-config";
import { parseSimpleOrder, toRpcPayload } from "@/lib/public-order";

export const runtime = "nodejs";
const limits = [
  { scope: "ip", limit: 30 },
  { scope: "phone", limit: 8 },
  { scope: "order", limit: 8 },
] as const;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response(400, "O pedido enviado é inválido.");
  }
  const parsed = parseSimpleOrder(body);
  if (!parsed.data) return response(400, parsed.error);
  const order = parsed.data;

  try {
    const client = createAdminClient();
    const slug = getCurrentStoreSlug();
    const salt = process.env.PUBLIC_ORDER_RATE_LIMIT_SALT;
    if (!salt) throw new Error("PUBLIC_ORDER_RATE_LIMIT_SALT não configurada.");
    const values = {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
      phone: order.phone,
      order: order.idempotencyKey,
    };
    for (const rule of limits) {
      const key = createHash("sha256")
        .update(`${salt}:${rule.scope}:${values[rule.scope]}`)
        .digest("hex");
      const { data, error } = await client.rpc(
        "consume_public_order_rate_limit",
        {
          p_store_slug: slug,
          p_rate_key: key,
          p_limit: rule.limit,
          p_window_seconds: 600,
        },
      );
      if (error) throw error;
      if (!data)
        return response(
          429,
          "Aguarde alguns minutos antes de tentar novamente.",
        );
    }
    const { data, error } = await client.rpc(
      "create_public_order_with_tracking",
      {
        p_store_slug: slug,
        p_idempotency_key: order.idempotencyKey,
        p_request: toRpcPayload(order),
        p_tracking_token: order.trackingToken,
      },
    );
    if (error || !data) return response(422, publicMessage(error?.message));
    return NextResponse.json(
      {
        success: true,
        order: {
          publicCode: data.public_code,
          trackingToken: order.trackingToken,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("[POST /api/orders]", error);
    return response(503, "A loja ainda não está disponível para pedidos.");
  }
}

function publicMessage(message?: string) {
  if (message === "STORE_CLOSED") return "A loja está fechada neste momento.";
  if (message === "STORE_PAUSED")
    return "Os pedidos estão pausados temporariamente.";
  if (message === "PRODUCT_UNAVAILABLE")
    return "Um produto do carrinho não está mais disponível.";
  if (message === "MINIMUM_ORDER_NOT_REACHED")
    return "O pedido mínimo para entrega não foi atingido.";
  if (
    message === "STORE_NOT_FOUND" ||
    message === "STORE_CONFIGURATION_MISSING"
  )
    return "A loja ainda não está disponível para pedidos.";
  return "Não foi possível enviar o pedido. Revise os dados e tente novamente.";
}
function response(status: number, message: string) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}
