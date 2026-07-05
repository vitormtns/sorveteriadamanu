import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";

export default function DeliveryPage() {
  return <main className="grid min-h-screen place-items-center bg-[#24002f] px-5 py-16 text-white"><div className="max-w-lg text-center"><span className="relative mx-auto block h-20 w-20 overflow-hidden rounded-2xl border border-white/20 bg-white"><Image src="/logo/logo-sorveteria.png" alt="Logo da Sorveteria da Manu" fill sizes="80px" className="object-cover" /></span><div className="mx-auto mt-8 grid h-12 w-12 place-items-center rounded-full bg-white/10"><Clock3 /></div><h1 className="mt-5 text-3xl font-bold tracking-[-.04em]">Delivery em preparação</h1><p className="mt-3 leading-relaxed text-white/60">O cardápio online da Manu está sendo organizado. Em breve, seu pedido vai direto para a equipe.</p><Link href="/" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#f8b900] px-6 text-sm font-bold text-[#24002f]"><ArrowLeft size={17} /> Voltar ao início</Link></div></main>;
}
