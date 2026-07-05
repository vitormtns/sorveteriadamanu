import { Clock3, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { AnimatedSection } from "./animated-section";

const contacts = [
  { icon: MessageCircle, label: "WhatsApp", value: "Fale com a equipe" },
  { icon: Clock3, label: "Atendimento", value: "Consulte o horário do dia" },
  { icon: ShoppingBag, label: "Como pedir", value: "Retirada ou delivery" },
  { icon: MapPin, label: "Localização", value: "Endereço em atualização" },
];

export function ContactSection() {
  return <section className="bg-[#fff8ef] px-5 py-20 md:px-8 md:py-28"><div className="mx-auto max-w-[1240px]"><AnimatedSection><p className="landing-kicker">Perto de você</p><h2 className="landing-title mt-3">Peça, retire ou receba.</h2></AnimatedSection><div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{contacts.map(({ icon: Icon, label, value }, index) => <AnimatedSection key={label} delay={index * 70}><div className="rounded-2xl border border-[#ecdcd0] bg-white p-5"><Icon size={19} className="text-[#4a0b63]" /><p className="mt-5 text-xs font-medium text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-[#16051f]">{value}</p></div></AnimatedSection>)}</div></div></section>;
}
