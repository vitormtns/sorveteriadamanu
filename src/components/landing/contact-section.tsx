"use client";

import { Clock3, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { AnimatedSection } from "./animated-section";
import { useStore } from "@/components/store-provider";

export function ContactSection() {
  const { settings } = useStore();
  const contacts = [
    { icon: MessageCircle, label: "WhatsApp", value: settings.site.whatsapp },
    { icon: Clock3, label: "Atendimento", value: settings.site.displayedHours },
    { icon: ShoppingBag, label: "Instagram", value: settings.site.instagram },
    { icon: MapPin, label: "Localização", value: settings.site.address },
  ].filter((contact) => contact.value.trim());
  return <section id="contato" className="landing-mobile-section bg-[#fff8ef] px-5 py-20 md:px-8 md:py-28"><div className="mx-auto max-w-[1240px]"><AnimatedSection><p className="landing-kicker">Perto de você</p><h2 className="landing-title mt-3">Peça, retire ou receba.</h2></AnimatedSection>{contacts.length ? <div className="contact-grid mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{contacts.map(({ icon: Icon, label, value }, index) => <AnimatedSection key={label} delay={index * 70}><div className="h-full rounded-2xl border border-[#ecdcd0] bg-white p-5"><Icon size={19} className="text-[#4a0b63]" /><p className="mt-5 text-xs font-medium text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#16051f]">{value}</p></div></AnimatedSection>)}</div> : <p className="mt-9 rounded-2xl border border-[#ecdcd0] bg-white p-5 text-sm text-slate-500">Entre em contato com a equipe da Manu para consultar atendimento e localização.</p>}</div></section>;
}
