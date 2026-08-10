import { NextResponse } from "next/server";
import {
  getStorefrontErrorStatus,
  getStorefrontPublicError,
  loadPublicStorefront,
} from "@/data/storefront";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const storefront = await loadPublicStorefront();
    return NextResponse.json(
      { success: true, ...storefront },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /api/storefront] Falha", {
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
    return NextResponse.json(
      { success: false, error: getStorefrontPublicError(error) },
      {
        status: getStorefrontErrorStatus(error),
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
