"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AnimatedSection } from "./animated-section";
import { useStore } from "@/components/store-provider";
import { getStoreAvailability } from "@/lib/settings";

export function DeliverySection() {
  const { settings } = useStore();
  const availability = getStoreAvailability(settings);
  return <section id="delivery" className="bg-[#fff8ef] px-5 pb-20 md:px-8 md:pb-28"><AnimatedSection className="mx-auto max-w-[1240px]"><div className="relative overflow-hidden rounded-[1.5rem] bg-[#4a0b63] px-6 py-11 text-white md:rounded-[2rem] md:px-12 md:py-16"><div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[#ff6fae]/25 blur-3xl" /><div className="absolute bottom-0 right-8 hidden text-[13rem] font-black leading-none text-white/[.035] lg:block">MANU</div><div className="relative max-w-2xl"><p className="landing-kicker landing-kicker--light">Delivery da Manu</p><h2 className="landing-title landing-title--light mt-3">Peça online sem esperar resposta no WhatsApp.</h2><p className="mt-5 max-w-xl leading-relaxed text-[#e8ddf0]">Monte seu açaí, sorvete ou milk-shake, confira o pedido e envie direto para a equipe da Manu.</p><p className={`mt-4 flex max-w-xl items-start gap-2 text-xs leading-relaxed ${availability.acceptingOrders ? "font-semibold text-emerald-200" : "text-white/70"}`}><span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${availability.acceptingOrders ? "bg-emerald-300" : "bg-amber-300"}`} />{availability.acceptingOrders ? "Delivery aberto" : availability.message}</p><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#e8ddf0]"><span className="flex items-center gap-2"><Check size={16} className="text-[#f8b900]" /> Pedido organizado</span><span className="flex items-center gap-2"><Check size={16} className="text-[#f8b900]" /> Retirada ou entrega</span></div><Link href="/delivery" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-[#f8b900] px-6 text-sm font-bold text-[#24002f] transition hover:-translate-y-1">Abrir delivery <ArrowRight size={17} /></Link></div></div></AnimatedSection></section>;
}
