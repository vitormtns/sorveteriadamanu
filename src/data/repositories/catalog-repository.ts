import { ConfigurableItem, Product, Promotion } from "@/lib/types";
import { mapAddOnFromDatabase, mapFlavorFromDatabase, mapPromotionFromDatabase } from "@/data/mappers/catalog";
import { mapProductFromDatabase } from "@/data/mappers/product";
import { fail, ok, RepositoryClient, RepositoryResult } from "./types";

export interface PublicCatalog {
  products: Product[];
  promotions: Promotion[];
  addOns: ConfigurableItem[];
  iceCreamFlavors: ConfigurableItem[];
  milkshakeFlavors: ConfigurableItem[];
}

export interface CatalogRepository {
  getAvailableCatalog(): Promise<RepositoryResult<PublicCatalog>>;
}

export function createCatalogRepository(client: RepositoryClient): CatalogRepository {
  return {
    async getAvailableCatalog() {
      const [productsResult, promotionsResult, addOnsResult, flavorsResult] = await Promise.all([
        client
          .from("products")
          .select("*")
          .eq("active", true)
          .eq("available_today", true)
          .order("display_order", { ascending: true }),
        client
          .from("promotions")
          .select("*")
          .eq("active", true)
          .order("display_order", { ascending: true }),
        client
          .from("add_ons")
          .select("*")
          .eq("active", true)
          .eq("available", true)
          .order("display_order", { ascending: true }),
        client
          .from("flavors")
          .select("*")
          .eq("active", true)
          .eq("available", true)
          .order("display_order", { ascending: true }),
      ]);

      if (productsResult.error) return fail(productsResult.error);
      if (promotionsResult.error) return fail(promotionsResult.error);
      if (addOnsResult.error) return fail(addOnsResult.error);
      if (flavorsResult.error) return fail(flavorsResult.error);

      const flavors = (flavorsResult.data ?? []).map(mapFlavorFromDatabase);
      const now = Date.now();

      return ok({
        products: (productsResult.data ?? []).map(mapProductFromDatabase),
        promotions: (promotionsResult.data ?? [])
          .map(mapPromotionFromDatabase)
          .filter((promotion) => (!promotion.validFrom || new Date(promotion.validFrom).getTime() <= now)
            && (!promotion.validUntil || new Date(promotion.validUntil).getTime() >= now)),
        addOns: (addOnsResult.data ?? []).map(mapAddOnFromDatabase),
        iceCreamFlavors: flavors.filter((flavor) => flavor.productType === "ice_cream"),
        milkshakeFlavors: flavors.filter((flavor) => flavor.productType === "milkshake"),
      });
    },
  };
}
