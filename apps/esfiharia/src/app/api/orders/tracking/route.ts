import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStoreSlug } from "@/lib/store-config";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.toUpperCase() ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!/^M[0-9A-F]{12}$/.test(code) || !/^[A-Za-z0-9_-]{32,128}$/.test(token))
    return missing();
  try {
    const { data, error } = await createAdminClient().rpc(
      "get_public_order_tracking",
      {
        p_store_slug: getCurrentStoreSlug(),
        p_public_code: code,
        p_tracking_token: token,
      },
    );
    if (error || !data) return missing();
    return NextResponse.json(
      { success: true, order: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Não foi possível consultar o pedido agora." },
      },
      { status: 503 },
    );
  }
}
function missing() {
  return NextResponse.json(
    { success: false, error: { message: "Pedido não encontrado." } },
    { status: 404 },
  );
}
