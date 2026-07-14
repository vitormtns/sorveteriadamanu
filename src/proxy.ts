import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/sistema", "/pedidos", "/produtos", "/configuracoes"];

export async function proxy(request: NextRequest) {
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
  const isLogin = request.nextUrl.pathname === "/login";
  if (!isProtected && !isLogin) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return isLogin ? NextResponse.next() : NextResponse.redirect(new URL("/login?erro=configuracao", request.url));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return isLogin ? response : redirectToLogin(request, response);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.active || profile.role !== "owner") {
    await supabase.auth.signOut();
    return isLogin ? response : redirectWithCookies(new URL("/login?erro=conta", request.url), response);
  }

  if (isLogin) return redirectWithCookies(new URL("/sistema", request.url), response);

  return response;
}

function redirectToLogin(request: NextRequest, response: NextResponse) {
  const target = new URL("/login", request.url);
  target.searchParams.set("retorno", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return redirectWithCookies(target, response);
}

function redirectWithCookies(target: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(target);
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export const config = { matcher: ["/login", "/sistema/:path*", "/pedidos/:path*", "/produtos/:path*", "/configuracoes/:path*"] };
