"use client";

import Link from "next/link";
import { IceCreamBowl, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { toDateInput } from "@/lib/utils";

export function MobileLandingNav() {
  const { settings } = useStore();
  const today = toDateInput(new Date());
  const hasFeaturedPromotion = settings.promotions.some((promotion) =>
    promotion.active
    && promotion.featuredOnHome
    && promotion.title.trim()
    && promotion.price > 0
    && (!promotion.validFrom || promotion.validFrom.slice(0, 10) <= today)
    && (!promotion.validUntil || promotion.validUntil.slice(0, 10) >= today),
  );
  return (
    <nav className="mobile-landing-nav" aria-label="Ações principais">
      <a href="#cardapio" className="mobile-landing-nav__secondary"><IceCreamBowl size={20} /> Cardápio</a>
      <Link href="/delivery" className="mobile-landing-nav__primary"><ShoppingBag size={20} /> Fazer pedido</Link>
      {hasFeaturedPromotion
        ? <a href="#promocoes" className="mobile-landing-nav__secondary"><Sparkles size={20} /> Promoções</a>
        : <a href="#contato" className="mobile-landing-nav__secondary"><MessageCircle size={20} /> Contato</a>}
    </nav>
  );
}
