import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentStoreSlug } from "@/lib/store-config";

const protectedPaths = ["/sistema", "/pedidos", "/produtos", "/configuracoes"];
export async function proxy(request: NextRequest) {
  const protectedRoute = protectedPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`),
  );
  if (!protectedRoute) return NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !service)
    return NextResponse.redirect(
      new URL("/login?erro=configuracao", request.url),
    );
  let response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return redirect(request, response, "/login");
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: store } = await admin
    .from("stores")
    .select("id")
    .eq("slug", getCurrentStoreSlug())
    .maybeSingle();
  if (!store)
    return redirect(request, response, "/login?erro=configuracao");
  const [profile, membership] = await Promise.all([
    client
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .maybeSingle(),
    client
      .from("profile_stores")
      .select("store_id")
      .eq("profile_id", user.id)
      .eq("store_id", store.id)
      .maybeSingle(),
  ]);
  if (
    !profile.data?.active ||
    profile.data.role !== "owner" ||
    !membership.data
  ) {
    await client.auth.signOut();
    return redirect(request, response, "/login?erro=acesso");
  }
  return response;
}
function redirect(request: NextRequest, response: NextResponse, path: string) {
  const target = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}
export const config = {
  matcher: [
    "/sistema/:path*",
    "/pedidos/:path*",
    "/produtos/:path*",
    "/configuracoes/:path*",
  ],
};
