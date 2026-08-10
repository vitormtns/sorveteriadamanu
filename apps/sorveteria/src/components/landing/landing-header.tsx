import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

const links = [
  { href: "#inicio", label: "Início" },
  { href: "#cardapio", label: "Cardápio" },
  { href: "#promocoes", label: "Promoções" },
  { href: "#delivery", label: "Delivery" },
];

export function LandingHeader() {
  return (
    <header className="landing-header fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#24002f]/80 backdrop-blur-xl">
      <div className="landing-header-inner mx-auto flex h-18 max-w-[1440px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Sorveteria da Manu">
          <span className="landing-header-logo relative h-11 w-11 overflow-hidden rounded-xl border border-white/20 bg-white"><Image src="/logo/logo-sorveteria.png" alt="" fill sizes="44px" className="object-cover" /></span>
          <span><span className="block text-[10px] font-medium leading-none text-pink-200">Sorveteria da</span><span className="mt-1 block text-base font-bold leading-none text-white">Manu</span></span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">{links.map((link) => <a key={link.href} href={link.href} className="text-sm font-medium text-white/70 transition hover:text-white">{link.label}</a>)}</nav>
        <Link href="/delivery" className="hidden min-h-11 items-center gap-2 rounded-full bg-[#f8b900] px-5 text-sm font-bold text-[#24002f] transition hover:-translate-y-0.5 hover:bg-[#ffc72c] lg:inline-flex"><ShoppingBag size={17} /> Fazer pedido</Link>
      </div>
    </header>
  );
}
