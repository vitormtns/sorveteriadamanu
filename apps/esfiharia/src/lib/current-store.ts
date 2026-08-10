import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentStoreSlug } from "./store-config";
import { StoreIdentity } from "./types";

export async function resolveConfiguredStore(
  client: SupabaseClient,
): Promise<StoreIdentity> {
  const slug = getCurrentStoreSlug();
  const { data, error } = await client
    .from("stores")
    .select("id, slug, name, type, active")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`A loja configurada (${slug}) não existe.`);
  return data as StoreIdentity;
}
