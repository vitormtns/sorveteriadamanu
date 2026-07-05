import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { InteractiveHeroVisual } from "./interactive-hero-visual";

export function HeroSection() {
  return (
    <section id="inicio" className="relative min-h-[92svh] overflow-hidden bg-[#24002f] text-white">
      <InteractiveHeroVisual />
      <div className="hero-overlay absolute inset-0 bg-[linear-gradient(90deg,#24002f_8%,rgba(36,0,47,.9)_35%,rgba(36,0,47,.2)_72%),linear-gradient(0deg,#24002f_0%,transparent_35%)]" />
      <div className="absolute -left-32 top-32 h-96 w-96 rounded-full bg-[#ff6fae]/10 blur-3xl" />
      <div className="hero-content relative mx-auto flex min-h-[92svh] max-w-[1440px] items-center px-5 pb-16 pt-28 md:px-8">
        <div className="hero-copy max-w-2xl">
          <p className="hero-enter text-xs font-bold uppercase tracking-[.18em] text-[#f8b900]">Sorvete · Açaí · Crepe · Churros</p>
          <h1 className="hero-enter hero-delay mt-5 text-[clamp(3rem,7vw,7rem)] font-bold leading-[.9] tracking-[-.065em]">Seu momento<br /><span className="text-[#ff9bc7]">pede Manu.</span></h1>
          <p className="hero-enter hero-delay-2 mt-6 max-w-lg text-base leading-relaxed text-[#e8ddf0] md:text-lg">Açaí montado do seu jeito, sorvetes e sobremesas preparados para retirada ou delivery.</p>
          <div className="hero-actions hero-enter hero-delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/delivery" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f8b900] px-7 text-sm font-bold text-[#24002f] transition hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(248,185,0,.22)]">Fazer pedido <ArrowRight size={18} /></Link>
            <a href="#cardapio" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">Ver cardápio</a>
          </div>
        </div>
      </div>
      <a href="#destaques" aria-label="Ver destaques" className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 animate-bounce text-white/50 md:block"><ArrowDown /></a>
    </section>
  );
}
