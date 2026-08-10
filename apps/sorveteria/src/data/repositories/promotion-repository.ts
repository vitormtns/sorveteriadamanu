import { Promotion } from "@/lib/types";
import { mapPromotionFromDatabase, mapPromotionInsertToDatabase, mapPromotionUpdateToDatabase } from "@/data/mappers/catalog";
import { fail, ok, RepositoryClient, RepositoryResult } from "./types";

export interface PromotionRepository {
  list(): Promise<RepositoryResult<Promotion[]>>;
  create(promotion: Omit<Promotion, "id" | "createdAt" | "updatedAt">): Promise<RepositoryResult<Promotion>>;
  update(id: string, patch: Partial<Omit<Promotion, "id" | "createdAt" | "updatedAt">>): Promise<RepositoryResult<Promotion>>;
}

export function createPromotionRepository(client: RepositoryClient): PromotionRepository {
  return {
    async list() {
      const { data, error } = await client
        .from("promotions")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) return fail(error);
      return ok((data ?? []).map(mapPromotionFromDatabase));
    },

    async create(promotion) {
      const { data, error } = await client
        .from("promotions")
        .insert(mapPromotionInsertToDatabase(promotion))
        .select("*")
        .single();

      if (error) return fail(error);
      return ok(mapPromotionFromDatabase(data));
    },

    async update(id, patch) {
      const { data, error } = await client
        .from("promotions")
        .update(mapPromotionUpdateToDatabase(patch))
        .eq("id", id)
        .select("*")
        .single();

      if (error) return fail(error);
      return ok(mapPromotionFromDatabase(data));
    },
  };
}
