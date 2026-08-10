import "server-only";

import { AppSupabaseClient } from "@/data/supabase/browser";
import { StoreIdentity } from "@/lib/types";
import { getCurrentStoreSlug } from "@/lib/store-config";
import { assertStoreIdentity } from "@/lib/store-scope";

export async function resolveCurrentStore(client: AppSupabaseClient): Promise<StoreIdentity> {
  const slug = getCurrentStoreSlug();
  const { data, error } = await client
    .from("stores")
    .select("id, slug, name, type")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`A loja configurada (${slug}) não está ativa ou não existe.`);
  return assertStoreIdentity(data as StoreIdentity);
}
