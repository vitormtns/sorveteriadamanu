"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedSection } from "./animated-section";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/utils";

export function PromoSection() {
  const { settings } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const promotion = settings.promotions.find((item) => item.active && item.featuredOnHome && (!item.validUntil || item.validUntil >= today));
  if (!promotion) return null;
  return <section id="promocoes" className="bg-[#f7dce8] px-5 py-20 md:px-8 md:py-28"><AnimatedSection className="mx-auto max-w-[1240px]"><div className="grid overflow-hidden rounded-[2rem] border border-white/60 bg-[#fff8ef] lg:grid-cols-[1fr_.8fr]"><div className="p-7 md:p-12"><span className="inline-flex rounded-full bg-[#24002f] px-3 py-1 text-[10px] font-bold uppercase tracking-[.13em] text-white">Promoção do dia</span><h2 className="mt-7 max-w-xl text-4xl font-bold leading-[1.02] tracking-[-.055em] text-[#16051f] md:text-6xl">{promotion.title}</h2><p className="mt-5 max-w-lg leading-relaxed text-slate-500">{promotion.description}</p><strong className="mt-5 block text-2xl text-[#4a0b63]">{formatCurrency(promotion.price)}</strong><Link href="/delivery" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#4a0b63]">Pedir promoção <ArrowRight size={17} /></Link></div><div className="relative min-h-72 overflow-hidden bg-[#f8b900]"><div className="absolute -bottom-20 -right-16 h-80 w-80 rounded-full bg-[#ff6fae]" /><div className="absolute -left-14 top-10 h-52 w-52 rounded-full bg-[#4a0b63]" /><div className="absolute inset-0 grid place-items-center"><span className="-rotate-6 text-center text-3xl font-black uppercase leading-none text-white md:text-5xl">Oferta<br />da Manu</span></div></div></div></AnimatedSection></section>;
}
