"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatedSection } from "./animated-section";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/utils";

const colors = ["from-[#390048] to-[#6f1780]", "from-[#f58ab8] to-[#ffb2d1]", "from-[#70402f] to-[#c38363]", "from-[#df9f00] to-[#f8c83e]"];
export function ProductsSection() {
  const { products } = useStore();
  const visibleProducts = products
    .filter((product) => product.active && product.availableToday && product.featured)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 4);
  return <section id="cardapio" className="landing-mobile-section bg-[#fff8ef] px-5 py-20 md:px-8 md:py-28"><div className="mx-auto max-w-[1240px]"><AnimatedSection className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="landing-kicker">Escolha o seu</p><h2 className="landing-title mt-3">Tem vontade para todo momento.</h2></div><Link href="/delivery" className="inline-flex items-center gap-2 text-sm font-bold text-[#4a0b63]">Ver opções <ArrowUpRight size={18} /></Link></AnimatedSection>{visibleProducts.length ? <div className="products-grid mt-10 grid auto-rows-[190px] gap-3 md:grid-cols-4">{visibleProducts.map((product, index) => <AnimatedSection key={product.id} delay={index * 60} className="product-item"><Link href="/delivery" className={`group relative flex h-full overflow-hidden rounded-2xl bg-gradient-to-br ${colors[index % colors.length]} p-6 text-white`}><div className="absolute -bottom-16 -right-12 h-44 w-44 rounded-full border-[28px] border-white/10 transition duration-500 group-hover:scale-125" /><div className="relative mt-auto"><p className="text-xs font-medium text-white/75">{product.category} · {formatCurrency(product.price)}</p><h3 className="mt-1 text-2xl font-bold tracking-[-.04em]">{product.name}</h3></div><ArrowUpRight className="absolute right-5 top-5 opacity-70 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:opacity-100" /></Link></AnimatedSection>)}</div> : <p className="mt-10 rounded-2xl border border-[#ecdcd0] bg-white p-6 text-sm text-slate-500">Os destaques do dia serão publicados em breve.</p>}</div></section>;
}
