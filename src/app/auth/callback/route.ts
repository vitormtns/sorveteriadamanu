import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/data/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/sistema";
  const supabase = await createServerSupabaseClient();

  if (!code || !supabase) return NextResponse.redirect(new URL("/redefinir-senha?erro=link", request.url));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/redefinir-senha?erro=link", request.url));
  return NextResponse.redirect(new URL(safeNext, request.url));
}
