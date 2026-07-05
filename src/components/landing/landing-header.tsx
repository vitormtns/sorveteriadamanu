"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "#inicio", label: "Início" },
  { href: "#cardapio", label: "Cardápio" },
  { href: "#promocoes", label: "Promoções" },
  { href: "#delivery", label: "Delivery" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#24002f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Sorveteria da Manu">
          <span className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/20 bg-white"><Image src="/logo/logo-sorveteria.png" alt="" fill sizes="44px" className="object-cover" /></span>
          <span><span className="block text-[10px] font-medium leading-none text-pink-200">Sorveteria da</span><span className="mt-1 block text-base font-bold leading-none text-white">Manu</span></span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">{links.map((link) => <a key={link.href} href={link.href} className="text-sm font-medium text-white/70 transition hover:text-white">{link.label}</a>)}</nav>
        <div className="flex items-center gap-2">
          <Link href="/delivery" className="hidden min-h-11 items-center gap-2 rounded-full bg-[#f8b900] px-5 text-sm font-bold text-[#24002f] transition hover:-translate-y-0.5 hover:bg-[#ffc72c] sm:inline-flex"><ShoppingBag size={17} /> Fazer pedido</Link>
          <button onClick={() => setOpen(!open)} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white lg:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open && <nav className="border-t border-white/10 bg-[#24002f] px-5 py-4 lg:hidden">{links.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="block border-b border-white/8 py-3 text-sm font-medium text-white/80">{link.label}</a>)}<Link href="/delivery" className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-[#f8b900] font-bold text-[#24002f]">Fazer pedido</Link></nav>}
    </header>
  );
}
