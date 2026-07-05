"use client";

import { ClipboardList, IceCreamBowl, LayoutGrid, LogOut, Plus, PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "./brand-logo";

const links = [
  { href: "/sistema", label: "Início", icon: LayoutGrid },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/produtos", label: "Produtos", icon: IceCreamBowl },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/" || pathname === "/delivery" || pathname === "/login") return children;

  const title = pathname === "/sistema" ? "Pedidos" : pathname.includes("/novo") ? "Novo pedido" : pathname.startsWith("/produtos") ? "Produtos" : "Pedidos";
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(now);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);
  const today = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${String(now.getDate()).padStart(2, "0")} de ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
  const isActive = (href: string) => href === "/sistema" ? pathname === "/sistema" : pathname === href || (href === "/pedidos" && pathname.startsWith("/pedidos/") && !pathname.includes("/novo"));

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-white/5 bg-[var(--purple-dark)] px-3 py-5 text-white lg:flex">
        <div className="mb-8 px-2">
          <Link href="/sistema"><BrandLogo light /></Link>
        </div>
        <nav className="grid gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`relative flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition ${isActive(href) ? "bg-white/10 font-semibold text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
              {isActive(href) && <span className="absolute -left-3 h-6 w-1 rounded-r-full bg-[var(--yellow)]" />}
              <Icon size={19} strokeWidth={isActive(href) ? 2.5 : 2} />{label}
            </Link>
          ))}
        </nav>
        <button onClick={() => router.push("/login")} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-purple-300 hover:bg-white/5 hover:text-white"><LogOut size={18} /> Sair</button>
      </aside>
      <main className="lg:pl-56">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[#faf8f4]/92 px-5 backdrop-blur-md md:px-7 lg:px-9">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--purple)] via-[#762557] to-[var(--yellow)] opacity-90" />
          <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between">
            <div><h1 className="text-[19px] font-bold tracking-[-0.02em] text-[var(--text)] md:text-[22px]">{title}</h1><p className="mt-0.5 text-xs font-normal text-[var(--muted)] md:text-[13px]">{today}</p></div>
            <Link href="/pedidos/novo" className="hidden sm:block"><span className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--yellow)] px-4 text-sm font-semibold text-[var(--purple-dark)] transition hover:bg-[#e8ad00]"><Plus size={18} /> Novo pedido</span></Link>
            <Link href="/sistema" className="sm:hidden"><BrandLogo compact /></Link>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-5 pb-28 md:p-7 lg:p-9">{children}</div>
      </main>
      <nav className="fixed inset-x-2.5 bottom-2.5 z-40 grid h-[68px] grid-cols-4 rounded-[18px] border border-[var(--border)] bg-white/95 px-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_8px_30px_rgba(33,6,47,.11)] backdrop-blur-md lg:hidden">
        <Link href="/sistema" className={`m-1 flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${pathname === "/sistema" ? "bg-[#f5eff6] text-[var(--purple)]" : "text-slate-500"}`}><LayoutGrid size={21} strokeWidth={pathname === "/sistema" ? 2.3 : 1.8} />Início</Link>
        <Link href="/pedidos/novo" className="m-1 flex flex-col items-center justify-center gap-1 rounded-xl bg-[var(--yellow)] text-[10px] font-semibold text-[var(--purple-dark)] transition active:scale-[.97]"><PlusCircle size={21} strokeWidth={2.2} /><span>Novo pedido</span></Link>
        <Link href="/pedidos" className={`m-1 flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${pathname.startsWith("/pedidos") && !pathname.includes("/novo") ? "bg-[#f5eff6] text-[var(--purple)]" : "text-slate-500"}`}><ClipboardList size={21} strokeWidth={pathname.startsWith("/pedidos") ? 2.3 : 1.8} />Pedidos</Link>
        <Link href="/produtos" className={`m-1 flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${pathname.startsWith("/produtos") ? "bg-[#f5eff6] text-[var(--purple)]" : "text-slate-500"}`}><IceCreamBowl size={21} strokeWidth={pathname.startsWith("/produtos") ? 2.3 : 1.8} />Produtos</Link>
      </nav>
    </div>
  );
}
