import { AnimatedSection } from "./animated-section";

const steps = [
  { number: "01", title: "Escolha", text: "Monte seu pedido pelo cardápio online." },
  { number: "02", title: "Confirme", text: "Revise os itens e envie direto para a equipe." },
  { number: "03", title: "Receba", text: "Retire no balcão ou aguarde o delivery." },
];

export function ExperienceSection() {
  return <section className="experience-section relative overflow-hidden bg-[#24002f] px-5 py-20 text-white md:px-8 md:py-36"><div className="absolute right-[-10%] top-[-30%] h-[34rem] w-[34rem] rounded-full bg-[#ff6fae]/10 blur-3xl" /><div className="relative mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-14"><AnimatedSection><p className="landing-kicker landing-kicker--light">Do balcão até sua casa</p><h2 className="landing-title landing-title--light mt-3">Pedir ficou tão simples quanto escolher o sabor.</h2><p className="mt-5 max-w-md leading-relaxed text-[#d8c6df]">Seu pedido chega organizado para a equipe da Manu. Menos mensagens, menos espera e mais rapidez para preparar tudo.</p></AnimatedSection><div className="grid gap-3">{steps.map((step, index) => <AnimatedSection key={step.number} delay={index * 100}><div className="group grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-white/[.14] bg-white/[.07] p-5 backdrop-blur transition hover:border-white/25 hover:bg-white/[.10] md:gap-5"><span className="text-sm font-bold text-[#ff8fc7]">{step.number}</span><div><h3 className="text-lg font-bold text-[#fff8ef] md:text-xl">{step.title}</h3><p className="mt-1 text-sm leading-relaxed text-[#d8c6df]">{step.text}</p></div></div></AnimatedSection>)}</div></div></section>;
}
