import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { numericToNumber } from "@/data/mappers/numeric";
import { createSupabaseAdminClient } from "@/data/supabase/admin";
import { parsePublicOrderRequest, publicOrderError, toPublicOrderRpcPayload } from "@/lib/public-order";

export const runtime = "nodejs";

const RATE_LIMITS = [
  { scope: "ip", limit: 30, windowSeconds: 600 },
  { scope: "phone", limit: 8, windowSeconds: 600 },
  { scope: "idempotency", limit: 8, windowSeconds: 600 },
] as const;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function originIsAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expectedOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  return Boolean(expectedOrigin && origin && origin === expectedOrigin);
}

function rateKey(scope: string, value: string): string {
  const salt = process.env.PUBLIC_ORDER_RATE_LIMIT_SALT;
  if (!salt) throw new Error("PUBLIC_ORDER_RATE_LIMIT_SALT não está configurada.");
  return createHash("sha256").update(`${salt}:${scope}:${value}`).digest("hex");
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  if (!originIsAllowed(request)) return errorResponse(403, "ORIGIN_NOT_ALLOWED", "Não foi possível validar a origem deste pedido.");

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return errorResponse(400, "PAYLOAD_INVALID", "O pedido enviado é inválido.");
  }
  const parsed = parsePublicOrderRequest(parsedBody);
  if ("code" in parsed) return errorResponse(400, parsed.code, parsed.message);

  try {
    const client = createSupabaseAdminClient();
    const rateValues = { ip: getClientIp(request), phone: parsed.phone, idempotency: parsed.idempotencyKey };
    for (const rule of RATE_LIMITS) {
      const { data, error } = await client.rpc("consume_public_order_rate_limit", {
        p_rate_key: rateKey(rule.scope, rateValues[rule.scope]),
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
      });
      if (error) throw error;
      if (!data) return errorResponse(429, "RATE_LIMITED", "Aguarde alguns minutos antes de tentar novamente.");
    }

    const { data: order, error } = await client.rpc("create_public_order", {
      p_idempotency_key: parsed.idempotencyKey,
      p_request: toPublicOrderRpcPayload(parsed),
    });
    if (error || !order) {
      const mapped = publicOrderError(error?.code === "23505" ? 409 : 422, error?.message);
      if (process.env.NODE_ENV === "development") console.error("[POST /api/orders] Falha na RPC", { code: error?.code, message: error?.message });
      return errorResponse(mapped.status, mapped.code, mapped.message);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        publicCode: order.public_code,
        status: order.order_status,
        paymentStatus: order.payment_status,
        subtotal: numericToNumber(order.subtotal),
        deliveryFee: numericToNumber(order.delivery_fee),
        discount: numericToNumber(order.discount),
        total: numericToNumber(order.total),
        createdAt: order.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[POST /api/orders] Falha inesperada", { message: error instanceof Error ? error.message : "Erro desconhecido" });
    return errorResponse(500, "ORDER_CREATION_FAILED", "Não foi possível enviar o pedido. Tente novamente.");
  }
}
