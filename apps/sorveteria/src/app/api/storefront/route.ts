import { NextResponse } from "next/server";
import { createCatalogRepository, createSettingsRepository } from "@/data/repositories";
import { createSupabaseAdminClient } from "@/data/supabase/admin";
import { resolveCurrentStore } from "@/lib/current-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = createSupabaseAdminClient();
    const store = await resolveCurrentStore(client);
    const [catalog, settings] = await Promise.all([
      createCatalogRepository(client, store).getAvailableCatalog(),
      createSettingsRepository(client, store).getPublic(),
    ]);

    if (catalog.error || settings.error) throw catalog.error ?? settings.error;
    return NextResponse.json(
      { success: true, store, catalog: catalog.data, settings: settings.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /api/storefront] Falha", {
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
    return NextResponse.json(
      { success: false, error: { code: "STOREFRONT_UNAVAILABLE", message: "Não foi possível carregar os dados da loja." } },
      { status: 503 },
    );
  }
}
