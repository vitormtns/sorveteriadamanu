import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { AppSupabaseClient } from "./browser";
import { Database } from "./database.types";

export async function createServerSupabaseClient(): Promise<AppSupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies. Route Handlers e Server Actions podem.
        }
      },
    },
  });
}
