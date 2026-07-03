"use client";

import { BarChart3, ClipboardList, IceCreamBowl, LogOut, Menu, PlusCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Visão geral", icon: BarChart3 },
  { href: "/pedidos/novo", label: "Novo pedido", icon: PlusCircle },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/produtos", label: "Produtos", icon: IceCreamBowl },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (pathname === "/login") return children;

  const title = pathname === "/" ? "Visão geral" : pathname.includes("/novo") ? "Novo pedido" : pathname.startsWith("/produtos") ? "Produtos" : "Pedidos";
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || (href === "/pedidos" && pathname.startsWith("/pedidos/") && !pathname.includes("/novo"));

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {open && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[var(--purple-dark)] p-5 text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-9 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--yellow)] text-2xl">🍨</div>
            <div><p className="font-black leading-tight">Sorveteria</p><p className="font-black leading-tight text-[var(--yellow)]">da Manu</p></div>
          </Link>
          <button className="lg:hidden" aria-label="Fechar menu" onClick={() => setOpen(false)}><X /></button>
        </div>
        <nav className="grid gap-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 font-semibold transition ${isActive(href) ? "bg-white text-[var(--purple)]" : "text-purple-100 hover:bg-white/10"}`}>
              <Icon size={20} />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/10 p-4 text-sm">
          <p className="font-bold">Atendimento</p>
          <p className="mt-1 text-purple-200">Dados salvos neste dispositivo</p>
        </div>
        <button onClick={() => router.push("/login")} className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3 text-purple-100 hover:bg-white/10"><LogOut size={18} /> Sair</button>
      </aside>
      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-slate-100 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2 hover:bg-slate-100 lg:hidden" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu /></button>
            <div><h1 className="text-xl font-black text-slate-900">{title}</h1><p className="hidden text-xs text-slate-500 sm:block">Sorveteria da Manu</p></div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-pink-100 font-black text-pink-700">M</div>
        </header>
        <div className="mx-auto max-w-7xl p-4 pb-28 md:p-8">{children}</div>
      </main>
      <Link href="/pedidos/novo" aria-label="Criar novo pedido" className="fixed bottom-5 right-5 z-20 grid h-16 w-16 place-items-center rounded-full bg-[var(--yellow)] text-[var(--purple-dark)] shadow-xl hover:scale-105 lg:hidden"><PlusCircle size={30} /></Link>
    </div>
  );
}
