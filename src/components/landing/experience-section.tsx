import { AnimatedSection } from "./animated-section";

const steps = [
  { number: "01", title: "Escolha", text: "Monte seu pedido pelo cardápio online." },
  { number: "02", title: "Confirme", text: "Revise os itens e envie direto para a equipe." },
  { number: "03", title: "Receba", text: "Retire no balcão ou aguarde o delivery." },
];

export function ExperienceSection() {
  return <section className="relative overflow-hidden bg-[#24002f] px-5 py-24 text-white md:px-8 md:py-36"><div className="absolute right-[-10%] top-[-30%] h-[34rem] w-[34rem] rounded-full bg-[#ff6fae]/10 blur-3xl" /><div className="relative mx-auto grid max-w-[1240px] gap-14 lg:grid-cols-[.8fr_1.2fr]"><AnimatedSection><p className="landing-kicker text-[#f8b900]">Do balcão até sua casa</p><h2 className="landing-title mt-3 text-white">Pedir ficou tão simples quanto escolher o sabor.</h2><p className="mt-5 max-w-md leading-relaxed text-white/60">Seu pedido chega organizado para a equipe da Manu. Menos mensagens, menos espera e mais rapidez para preparar tudo.</p></AnimatedSection><div className="grid gap-3">{steps.map((step, index) => <AnimatedSection key={step.number} delay={index * 100}><div className="group grid grid-cols-[auto_1fr] gap-5 rounded-2xl border border-white/10 bg-white/[.04] p-5 backdrop-blur transition hover:border-white/20 hover:bg-white/[.07]"><span className="text-sm font-bold text-[#ff8cbe]">{step.number}</span><div><h3 className="text-xl font-bold">{step.title}</h3><p className="mt-1 text-sm text-white/55">{step.text}</p></div></div></AnimatedSection>)}</div></div></section>;
}
