"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedSection } from "./animated-section";
import { useStore } from "@/components/store-provider";
import { formatCurrency, toDateInput } from "@/lib/utils";

export function PromoSection() {
  const { settings } = useStore();
  const today = toDateInput(new Date());
  const promotion = settings.promotions.find((item) =>
    item.active
    && item.featuredOnHome
    && item.title.trim()
    && item.price > 0
    && (!item.validFrom || item.validFrom.slice(0, 10) <= today)
    && (!item.validUntil || item.validUntil.slice(0, 10) >= today),
  );
  if (!promotion) return null;
  return <section id="promocoes" className="bg-[#f7dce8] px-5 py-20 md:px-8 md:py-28"><AnimatedSection className="mx-auto max-w-[1240px]"><div className="grid overflow-hidden rounded-[2rem] border border-white/60 bg-[#fff8ef] lg:grid-cols-[.85fr_1.15fr]"><div className="order-2 p-6 md:p-9 lg:order-1 lg:p-11"><span className="inline-flex rounded-full bg-[#24002f] px-3 py-1 text-[10px] font-bold uppercase tracking-[.13em] text-white">Promoção do dia</span><h2 className="mt-5 max-w-xl text-3xl font-bold leading-[1.03] tracking-[-.05em] text-[#16051f] md:text-5xl">{promotion.title}</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500 md:mt-4 md:text-base">{promotion.description}</p><div className="mt-5 flex items-center justify-between gap-4 border-t border-[#eadbd2] pt-5"><strong className="text-2xl text-[#4a0b63]">{formatCurrency(promotion.price)}</strong><Link href="/delivery" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f8b900] px-5 text-sm font-bold text-[#24002f] transition hover:-translate-y-0.5">Pedir <ArrowRight size={16} /></Link></div></div><div className="relative order-1 min-h-[22rem] overflow-hidden bg-[#f8b900] lg:order-2 lg:min-h-[32rem]"><div className="absolute -bottom-20 -right-16 h-80 w-80 rounded-full bg-[#ff6fae] md:h-96 md:w-96" /><div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-[#4a0b63] md:h-72 md:w-72" /><div className="absolute right-[14%] top-[12%] h-24 w-24 rounded-full border-[18px] border-white/20 md:h-32 md:w-32 md:border-[22px]" /><div className="absolute inset-0 grid place-items-center"><span className="-rotate-6 text-center text-4xl font-black uppercase leading-none text-white drop-shadow-sm md:text-6xl">Oferta<br />da Manu</span></div></div></div></AnimatedSection></section>;
}
