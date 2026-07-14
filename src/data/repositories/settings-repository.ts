import { StoreSettings } from "@/lib/types";
import { mapAddOnFromDatabase, mapFlavorFromDatabase, mapPromotionFromDatabase } from "@/data/mappers/catalog";
import { mapBusinessHoursToDatabase, mapPublicStoreSettingsFromDatabase, mapStoreSettingsFromDatabase, mapStoreSettingsUpdateToDatabase } from "@/data/mappers/settings";
import { fail, ok, RepositoryClient, RepositoryResult } from "./types";

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

    if (settingsResult.error) return fail(settingsResult.error);
    if (hoursResult.error) return fail(hoursResult.error);
    if (promotionsResult.error) return fail(promotionsResult.error);
    if (addOnsResult.error) return fail(addOnsResult.error);
    if (flavorsResult.error) return fail(flavorsResult.error);

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

      if (settingsResult.error) return fail(settingsResult.error);
      if (hoursResult.error) return fail(hoursResult.error);

      return ok(mapPublicStoreSettingsFromDatabase(settingsResult.data, hoursResult.data ?? []));
    },

    async update(settings) {
      const { error: settingsError } = await client
        .from("store_settings")
        .upsert(mapStoreSettingsUpdateToDatabase(settings), { onConflict: "id" });

      if (settingsError) return fail(settingsError);

      const { error: hoursError } = await client
        .from("business_hours")
        .upsert(mapBusinessHoursToDatabase(settings), { onConflict: "weekday" });

      if (hoursError) return fail(hoursError);
      return get();
    },
  };
}
