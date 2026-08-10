import { createClient } from "@supabase/supabase-js";
import { AppSupabaseClient } from "./browser";
import { Database } from "./database.types";

export function createSupabaseAdminClient(): AppSupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("O cliente administrativo do Supabase só pode ser usado no servidor.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
