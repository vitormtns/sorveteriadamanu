import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveConfiguredStore } from "@/lib/current-store";
import { BusinessHour, Product, StoreSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = createAdminClient();
    const store = await resolveConfiguredStore(client);
    if (!store.active)
      return NextResponse.json(
        { success: true, store, products: [], settings: null },
        { headers: { "Cache-Control": "no-store" } },
      );

    const [productsResult, settingsResult, hoursResult] = await Promise.all([
      client
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .eq("active", true)
        .eq("available_today", true)
        .order("display_order"),
      client
        .from("public_store_settings")
        .select("*")
        .eq("store_id", store.id)
        .maybeSingle(),
      client
        .from("business_hours")
        .select("weekday, enabled, open_time, close_time")
        .eq("store_id", store.id)
        .order("weekday"),
    ]);
    if (productsResult.error || settingsResult.error || hoursResult.error)
      throw productsResult.error ?? settingsResult.error ?? hoursResult.error;

    const products: Product[] = (productsResult.data ?? []).map((row) => ({
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      category: row.category,
      description: row.description ?? undefined,
      price: Number(row.price),
      active: row.active,
      availableToday: row.available_today,
      featured: row.featured,
      displayOrder: row.display_order,
      imageUrl: row.image_url ?? undefined,
    }));
    const hours: BusinessHour[] = (hoursResult.data ?? []).map((row) => ({
      weekday: row.weekday,
      enabled: row.enabled,
      open: row.open_time.slice(0, 5),
      close: row.close_time.slice(0, 5),
    }));
    const row = settingsResult.data;
    const settings: StoreSettings | null = row
      ? {
          deliveryOpen: row.delivery_open,
          paused: row.pause_online_orders || row.temporary_pause,
          closedToday: row.closed_today,
          closedMessage: row.closed_message,
          allowPickup: row.allow_pickup,
          allowDelivery: row.allow_delivery,
          deliveryFee: Number(row.delivery_fee),
          minimumOrder: Number(row.minimum_order),
          acceptedPaymentMethods: row.accepted_payment_methods,
          whatsapp: row.whatsapp,
          instagram: row.instagram,
          address: row.address,
          headline: row.headline,
          subtitle: row.subtitle,
          displayedHours: row.displayed_hours,
          hours,
        }
      : null;
    return NextResponse.json(
      { success: true, store, products, settings },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("[GET /api/storefront]", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível carregar a Esfiharia." },
      { status: 503 },
    );
  }
}
