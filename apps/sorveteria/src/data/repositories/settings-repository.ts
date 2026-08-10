import { StoreSettings } from "@/lib/types";
import { mapAddOnFromDatabase, mapFlavorFromDatabase, mapPromotionFromDatabase } from "@/data/mappers/catalog";
import { mapBusinessHoursToDatabase, mapPublicStoreSettingsFromDatabase, mapStoreSettingsFromDatabase, mapStoreSettingsUpdateToDatabase } from "@/data/mappers/settings";
import { fail, ok, RepositoryClient, RepositoryResult } from "./types";
import { moneyToDatabase } from "@/data/mappers/numeric";
import { Json } from "@/data/supabase/database.types";

type SettingsResource = "store_settings" | "store_configuration" | "business_hours" | "promotions" | "add_ons" | "flavors" | "public_store_settings";
type SettingsOperation = "select" | "rpc";

interface SettingsErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

export interface SettingsRepository {
  get(): Promise<RepositoryResult<StoreSettings>>;
  getPublic(): Promise<RepositoryResult<StoreSettings>>;
  update(settings: StoreSettings): Promise<RepositoryResult<StoreSettings>>;
}

export function createSettingsRepository(client: RepositoryClient): SettingsRepository {
  async function get(): Promise<RepositoryResult<StoreSettings>> {
    const [settingsResult, hoursResult, promotionsResult, addOnsResult, flavorsResult] = await Promise.all([
      client.from("store_settings").select("*").eq("id", true).single(),
      client.from("business_hours").select("*").order("weekday", { ascending: true }),
      client.from("promotions").select("*").order("display_order", { ascending: true }),
      client.from("add_ons").select("*").order("display_order", { ascending: true }),
      client.from("flavors").select("*").order("display_order", { ascending: true }),
    ]);

    if (settingsResult.error) return settingsFailure(settingsResult.error, "select", "store_settings");
    if (hoursResult.error) return settingsFailure(hoursResult.error, "select", "business_hours");
    if (promotionsResult.error) return settingsFailure(promotionsResult.error, "select", "promotions");
    if (addOnsResult.error) return settingsFailure(addOnsResult.error, "select", "add_ons");
    if (flavorsResult.error) return settingsFailure(flavorsResult.error, "select", "flavors");

    const settings = mapStoreSettingsFromDatabase(settingsResult.data, hoursResult.data ?? []);
    const flavors = (flavorsResult.data ?? []).map(mapFlavorFromDatabase);

    return ok({
      ...settings,
      promotions: (promotionsResult.data ?? []).map(mapPromotionFromDatabase),
      acaiExtras: (addOnsResult.data ?? []).map(mapAddOnFromDatabase),
      iceCreamFlavors: flavors.filter((flavor) => flavor.productType === "ice_cream"),
      milkshakeFlavors: flavors.filter((flavor) => flavor.productType === "milkshake"),
    });
  }

  return {
    get,

    async getPublic() {
      const [settingsResult, hoursResult] = await Promise.all([
        client.from("public_store_settings").select("*").single(),
        client.from("business_hours").select("*").order("weekday", { ascending: true }),
      ]);

      if (settingsResult.error) return settingsFailure(settingsResult.error, "select", "public_store_settings");
      if (hoursResult.error) return settingsFailure(hoursResult.error, "select", "business_hours");

      return ok(mapPublicStoreSettingsFromDatabase(settingsResult.data, hoursResult.data ?? []));
    },

    async update(settings) {
      const featuredPromotionId = settings.promotions.find((item) => item.featuredOnHome)?.id;
      const promotionRows = settings.promotions.map((item, index) => ({
        id: item.id, title: item.title.trim(), description: item.description,
        price: moneyToDatabase(Math.max(0, item.price)), active: item.active,
        featured_on_home: item.id === featuredPromotionId, valid_from: item.validFrom ?? null,
        valid_until: item.validUntil ?? null, image_url: item.imageUrl ?? null,
        display_order: item.displayOrder ?? index,
      })).sort((a, b) => Number(a.featured_on_home) - Number(b.featured_on_home));
      const addOnRows = settings.acaiExtras.map((item, index) => ({
        id: item.id, name: item.name.trim(), active: item.active ?? true,
        available: item.available, extra_price: moneyToDatabase(Math.max(0, item.extraPrice ?? 0)),
        display_order: item.displayOrder ?? index,
      }));
      const flavorRows = [
        ...settings.iceCreamFlavors.map((item, index) => ({ item, index, product_type: "ice_cream" as const })),
        ...settings.milkshakeFlavors.map((item, index) => ({ item, index, product_type: "milkshake" as const })),
      ].map(({ item, index, product_type }) => ({
        id: item.id, name: item.name.trim(), product_type, active: item.active ?? true,
        available: item.available, preview_color: item.previewColor ?? null,
        display_order: item.displayOrder ?? index,
      }));

      const { error } = await client.rpc("save_store_configuration", {
        p_settings: mapStoreSettingsUpdateToDatabase(settings) as unknown as Json,
        p_business_hours: mapBusinessHoursToDatabase(settings) as unknown as Json,
        p_promotions: promotionRows as unknown as Json,
        p_add_ons: addOnRows as unknown as Json,
        p_flavors: flavorRows as unknown as Json,
      });

      if (error) return settingsFailure(error, "rpc", "store_configuration");
      return get();
    },
  };
}

function settingsFailure(error: SettingsErrorLike, operation: SettingsOperation, resource: SettingsResource) {
  const status = error.status ?? inferHttpStatus(error.code);
  const result = fail(error, { operation, resource, status });
  if (process.env.NODE_ENV === "development") {
    console.error("[SettingsRepository] Falha no Supabase", {
      operation,
      resource,
      status,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }
  return result;
}

function inferHttpStatus(code?: string): number | undefined {
  if (code === "42501") return 403;
  if (code === "PGRST301" || code === "PGRST302") return 401;
  if (code === "42703" || code === "PGRST204" || code === "PGRST205") return 400;
  if (code?.startsWith("22") || code?.startsWith("23")) return 422;
  return undefined;
}
