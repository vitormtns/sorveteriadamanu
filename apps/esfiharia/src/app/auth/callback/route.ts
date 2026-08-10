import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/sistema";
  const client = await createServerSupabaseClient();
  if (code && client) await client.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(
    new URL(
      next.startsWith("/") && !next.startsWith("//") ? next : "/sistema",
      request.url,
    ),
  );
}
