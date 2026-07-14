import { Product } from "@/lib/types";
import { mapProductFromDatabase, mapProductInsertToDatabase, mapProductUpdateToDatabase } from "@/data/mappers/product";
import { fail, ok, RepositoryClient, RepositoryResult } from "./types";

export interface ProductRepository {
  list(): Promise<RepositoryResult<Product[]>>;
  create(product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<RepositoryResult<Product>>;
  update(id: string, patch: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>): Promise<RepositoryResult<Product>>;
  changeAvailability(id: string, availableToday: boolean): Promise<RepositoryResult<Product>>;
}

export function createProductRepository(client: RepositoryClient): ProductRepository {
  return {
    async list() {
      const { data, error } = await client
        .from("products")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) return fail(error);
      return ok((data ?? []).map(mapProductFromDatabase));
    },

    async create(product) {
      const { data, error } = await client
        .from("products")
        .insert(mapProductInsertToDatabase(product))
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
        .select("*")
        .single();

      if (error) return fail(error);
      return ok(mapProductFromDatabase(data));
    },

    async changeAvailability(id, availableToday) {
      return this.update(id, { availableToday });
    },
  };
}
