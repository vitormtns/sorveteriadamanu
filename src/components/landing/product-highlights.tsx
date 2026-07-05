import { Bike, IceCreamBowl, Sparkles, Wheat } from "lucide-react";
import { AnimatedSection } from "./animated-section";

const items = [
  { title: "Açaí montado na hora", text: "Você escolhe o tamanho e os complementos.", icon: Sparkles },
  { title: "Sorvetes e sobremesas", text: "Sabores para o copo, casquinha ou para dividir.", icon: IceCreamBowl },
  { title: "Crepes e churros", text: "Feitos na hora, quentes e bem recheados.", icon: Wheat },
  { title: "Delivery na cidade", text: "Pedido direto para a equipe, sem enrolação.", icon: Bike },
];

export function ProductHighlights() {
  return <section id="destaques" className="bg-[#fff8ef] px-5 py-20 md:px-8 md:py-28"><div className="mx-auto max-w-[1240px]"><AnimatedSection><p className="landing-kicker">Feito para matar a vontade</p><h2 className="landing-title mt-3 max-w-2xl">Do açaí caprichado ao churros quentinho.</h2></AnimatedSection><div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{items.map(({ title, text, icon: Icon }, index) => <AnimatedSection key={title} delay={index * 80} className="h-full"><article className="group h-full rounded-2xl border border-[#ecdcd0] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#d8b9cf] hover:shadow-[0_18px_50px_rgba(74,11,99,.08)]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f7edf8] text-[#4a0b63] transition group-hover:bg-[#4a0b63] group-hover:text-white"><Icon size={21} /></span><h3 className="mt-6 text-lg font-bold tracking-[-.02em] text-[#16051f]">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p></article></AnimatedSection>)}</div></div></section>;
}
