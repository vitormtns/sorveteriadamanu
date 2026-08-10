import { BadgePercent, CupSoda, IceCreamBowl, Sparkles } from "lucide-react";
import { AnimatedSection } from "./animated-section";

const items = [
  { title: "Açaí montado na hora", text: "Você escolhe o tamanho e monta do seu jeito.", icon: Sparkles },
  { title: "Sorvetes selecionados", text: "Sabores disponíveis no copo ou na casquinha.", icon: IceCreamBowl },
  { title: "Milk-shakes cremosos", text: "Gelados, encorpados e preparados na hora.", icon: CupSoda },
  { title: "Promoções do dia", text: "Combinações especiais para aproveitar e compartilhar.", icon: BadgePercent },
];
export function ProductHighlights() {
  return <section id="destaques" className="landing-mobile-section bg-[#fff8ef] px-5 py-20 md:px-8 md:py-28"><div className="mx-auto max-w-[1240px]"><AnimatedSection><p className="landing-kicker">Feito para matar a vontade</p><h2 className="landing-title mt-3 max-w-2xl">Açaí caprichado e delícias geladas.</h2></AnimatedSection><div className="highlights-grid mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{items.map(({ title, text, icon: Icon }, index) => <AnimatedSection key={title} delay={index * 80} className="highlight-item h-full"><article className="group h-full rounded-2xl border border-[#ecdcd0] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#d8b9cf] hover:shadow-[0_18px_50px_rgba(74,11,99,.08)]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f7edf8] text-[#4a0b63] transition group-hover:bg-[#4a0b63] group-hover:text-white"><Icon size={21} /></span><h3 className="mt-6 text-lg font-bold tracking-[-.02em] text-[#16051f]">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p></article></AnimatedSection>)}</div></div></section>;
}
