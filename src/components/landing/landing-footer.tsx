import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  return <footer className="bg-[#16051f] px-5 py-10 text-white md:px-8"><div className="mx-auto flex max-w-[1240px] flex-col gap-8 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-3"><span className="relative h-12 w-12 overflow-hidden rounded-xl bg-white"><Image src="/logo/logo-sorveteria.png" alt="Logo da Sorveteria da Manu" fill sizes="48px" className="object-cover" /></span><div><p className="text-xs text-pink-200">Sorveteria da</p><p className="font-bold">Manu</p></div></div><p className="mt-5 max-w-sm text-xs leading-relaxed text-white/40">Açaí, sorvetes, crepes e churros preparados para o seu momento.</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-white/50"><a href="#inicio">Início</a><a href="#cardapio">Cardápio</a><Link href="/delivery">Delivery</Link><Link href="/sistema">Área interna</Link></div></div><div className="mx-auto mt-8 max-w-[1240px] border-t border-white/10 pt-6 text-[11px] text-white/30">© {new Date().getFullYear()} Sorveteria da Manu.</div></footer>;
}
