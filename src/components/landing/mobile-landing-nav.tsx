import Link from "next/link";
import { IceCreamBowl, ShoppingBag, Sparkles } from "lucide-react";

export function MobileLandingNav() {
  return (
    <nav className="mobile-landing-nav" aria-label="Ações principais">
      <a href="#cardapio" className="mobile-landing-nav__secondary"><IceCreamBowl size={20} /> Cardápio</a>
      <Link href="/delivery" className="mobile-landing-nav__primary"><ShoppingBag size={20} /> Fazer pedido</Link>
      <a href="#promocoes" className="mobile-landing-nav__secondary"><Sparkles size={20} /> Promoções</a>
    </nav>
  );
}
