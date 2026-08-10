import { createBrowserSupabaseClient } from "@/data/supabase/browser";

export function createClient() {
  return createBrowserSupabaseClient();
}
