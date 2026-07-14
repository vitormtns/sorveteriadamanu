import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/data/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.toUpperCase() ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!/^M[0-9A-F]{12}$/.test(code) || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    return NextResponse.json({ success: false, error: { code: "TRACKING_NOT_FOUND", message: "Pedido não encontrado." } }, { status: 404 });
  }

  try {
    const client = createSupabaseAdminClient();
    const { data, error } = await client.rpc("get_public_order_tracking", { p_public_code: code, p_tracking_token: token });
    if (error || !data) return NextResponse.json({ success: false, error: { code: "TRACKING_NOT_FOUND", message: "Pedido não encontrado." } }, { status: 404 });
    return NextResponse.json({ success: true, order: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[GET /api/orders/tracking] Falha", { message: error instanceof Error ? error.message : "Erro desconhecido" });
    return NextResponse.json({ success: false, error: { code: "TRACKING_UNAVAILABLE", message: "Não foi possível consultar o pedido agora." } }, { status: 500 });
  }
}
