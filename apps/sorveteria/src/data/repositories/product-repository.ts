import { Product, StoreIdentity } from "@/lib/types";
import { mapProductFromDatabase, mapProductInsertToDatabase, mapProductUpdateToDatabase } from "@/data/mappers/product";
import { fail, ok, RepositoryClient, RepositoryResult } from "./types";

export interface ProductRepository {
  list(): Promise<RepositoryResult<Product[]>>;
  create(product: Omit<Product, "id" | "storeId" | "createdAt" | "updatedAt">): Promise<RepositoryResult<Product>>;
  update(id: string, patch: Partial<Omit<Product, "id" | "storeId" | "createdAt" | "updatedAt">>): Promise<RepositoryResult<Product>>;
  changeAvailability(id: string, availableToday: boolean): Promise<RepositoryResult<Product>>;
  delete(id: string): Promise<RepositoryResult<null>>;
}

export function createProductRepository(client: RepositoryClient, store: StoreIdentity): ProductRepository {
  return {
    async list() {
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) return fail(error);
      return ok((data ?? []).map(mapProductFromDatabase));
    },

    async create(product) {
      const { data, error } = await client
        .from("products")
        .insert({ ...mapProductInsertToDatabase(product), store_id: store.id })
        .select("*")
        .single();

      if (error) return fail(error);
      return ok(mapProductFromDatabase(data));
    },

    async update(id, patch) {
      const { data, error } = await client
        .from("products")
        .update(mapProductUpdateToDatabase(patch))
        .eq("id", id)
        .eq("store_id", store.id)
        .select("*")
        .single();

      if (error) return fail(error);
      return ok(mapProductFromDatabase(data));
    },

    async changeAvailability(id, availableToday) {
      return this.update(id, { availableToday });
    },

    async delete(id) {
      const { error } = await client.from("products").delete().eq("id", id).eq("store_id", store.id);
      return error ? fail(error) : ok(null);
    },
  };
}
