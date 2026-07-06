"use client";

import { ClipboardList, IceCreamBowl, LayoutGrid, LogOut, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "./brand-logo";

const links = [
  { href: "/sistema", label: "Início", icon: LayoutGrid },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/produtos", label: "Produtos", icon: IceCreamBowl },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/" || pathname === "/delivery" || pathname === "/login" || pathname.startsWith("/acompanhar/") || pathname.endsWith("/imprimir")) return children;

  const title = pathname === "/sistema" ? "Visão geral" : pathname.includes("/novo") ? "Novo pedido" : pathname.startsWith("/produtos") ? "Produtos" : pathname.startsWith("/configuracoes") ? "Configurações da loja" : "Pedidos";
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(now);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);
  const today = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${String(now.getDate()).padStart(2, "0")} de ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
  const isActive = (href: string) => href === "/sistema" ? pathname === "/sistema" : pathname === href || (href === "/pedidos" && pathname.startsWith("/pedidos/") && !pathname.includes("/novo"));

  return (
    <div className="internal-shell min-h-screen w-full max-w-full overflow-x-clip">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-white/5 bg-[linear-gradient(180deg,#21062f_0%,#30083e_60%,#21062f_100%)] px-3 py-5 text-white lg:flex">
        <div className="mb-8 px-2">
          <Link href="/sistema"><BrandLogo light /></Link>
        </div>
        <nav className="grid gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive(href) ? "bg-white/[.11] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]" : "text-purple-200/70 hover:bg-white/5 hover:text-white"}`}>
              {isActive(href) && <span className="absolute -left-3 h-6 w-1 rounded-r-full bg-[var(--yellow)]" />}
              <Icon size={19} strokeWidth={isActive(href) ? 2.5 : 2} />{label}
            </Link>
          ))}
        </nav>
        <button onClick={() => router.push("/login")} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-purple-300 hover:bg-white/5 hover:text-white"><LogOut size={18} /> Sair</button>
      </aside>
      <main className="min-w-0 lg:pl-56">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--purple-dark)] px-5 text-white backdrop-blur-md md:px-7 lg:border-[var(--border)] lg:bg-[#fbf7f0]/90 lg:text-[var(--text)] lg:px-9">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#ff6fae] via-[var(--yellow)] to-[#ff6fae] opacity-90" />
          <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between lg:h-[76px]">
            <div><h1 className="text-[19px] font-bold tracking-[-0.025em] md:text-[22px]">{title}</h1><p className="mt-0.5 text-[11px] font-normal text-purple-200 lg:text-[var(--muted)] md:text-[13px]">{today}</p></div>
            <Link href="/pedidos/novo" className="hidden sm:block"><span className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--yellow)] px-4 text-sm font-semibold text-[var(--purple-dark)] transition hover:bg-[#e8ad00]"><Plus size={18} /> Novo pedido</span></Link>
            <Link href="/sistema" className="sm:hidden"><BrandLogo compact /></Link>
          </div>
        </header>
        <div className="internal-content mx-auto min-w-0 max-w-[1440px] px-4 py-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-5 md:p-7 lg:p-9">{children}</div>
      </main>
      <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 grid h-[72px] grid-cols-5 rounded-[20px] border border-white/10 bg-[#21062f]/95 px-1 shadow-[0_12px_38px_rgba(33,6,47,.24)] backdrop-blur-xl lg:hidden">
        <Link href="/sistema" className={`m-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${pathname === "/sistema" ? "bg-white/10 text-white" : "text-purple-200/65"}`}><LayoutGrid size={20} strokeWidth={pathname === "/sistema" ? 2.3 : 1.8} />Início</Link>
        <Link href="/pedidos" className={`m-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${pathname.startsWith("/pedidos") && !pathname.includes("/novo") ? "bg-white/10 text-white" : "text-purple-200/65"}`}><ClipboardList size={20} strokeWidth={pathname.startsWith("/pedidos") && !pathname.includes("/novo") ? 2.3 : 1.8} />Pedidos</Link>
        <Link href="/pedidos/novo" aria-label="Novo pedido" className="-mt-4 flex min-w-0 flex-col items-center justify-start text-[10px] font-semibold text-white transition active:scale-[.96]">
          <span className={`grid h-14 w-14 place-items-center rounded-2xl border-4 border-[#21062f] bg-[var(--yellow)] text-[var(--purple-dark)] shadow-[0_8px_22px_rgba(248,185,0,.28)] ${pathname.includes("/novo") ? "ring-2 ring-white/70" : ""}`}><Plus size={25} strokeWidth={2.8} /></span>
          <span className="mt-0.5 leading-none">Novo</span>
        </Link>
        <Link href="/produtos" className={`m-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${pathname.startsWith("/produtos") ? "bg-white/10 text-white" : "text-purple-200/65"}`}><IceCreamBowl size={20} strokeWidth={pathname.startsWith("/produtos") ? 2.3 : 1.8} />Produtos</Link>
        <Link href="/configuracoes" className={`m-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${pathname.startsWith("/configuracoes") ? "bg-white/10 text-white" : "text-purple-200/65"}`}><Settings size={20} strokeWidth={pathname.startsWith("/configuracoes") ? 2.3 : 1.8} /><span className="truncate">Ajustes</span></Link>
      </nav>
    </div>
  );
}
