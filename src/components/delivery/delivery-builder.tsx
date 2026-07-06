"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, IceCreamBowl, Minus, PackageCheck, Plus, ShoppingBag, Sparkles, Trash2, Truck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useStore } from "@/components/store-provider";
import { PaymentMethod } from "@/lib/types";
import { formatCurrency, uid } from "@/lib/utils";

type Kind = "acai" | "icecream" | "milkshake" | "promo";
type CartItem = { id: string; productId: string; name: string; detail: string; price: number; quantity: number };
type Customer = { name: string; phone: string; deliveryType: "pickup" | "delivery"; address: string; payment: PaymentMethod | ""; notes: string };
type SetText = (value: string) => void;

const sizes = [{ name: "300 ml", price: 14 }, { name: "500 ml", price: 19 }, { name: "700 ml", price: 25 }, { name: "1 litro", price: 34 }];
const FREE_ACAI_EXTRAS = 3;
const extras = [{ name: "Leite condensado", price: 2 }, { name: "Leite em pó", price: 2 }, { name: "Granola", price: 2 }, { name: "Banana", price: 2 }, { name: "Morango", price: 3 }, { name: "Paçoca", price: 2 }, { name: "Amendoim", price: 2 }, { name: "Nutella", price: 3 }];
const formats = [{ name: "Copo", price: 0 }, { name: "Casquinha", price: 0 }];
const scoops = [{ name: "1 bola", price: 7, max: 1 }, { name: "2 bolas", price: 12, max: 2 }, { name: "3 bolas", price: 16, max: 3 }];
const flavors = ["Chocolate", "Morango", "Creme", "Flocos", "Napolitano", "Açaí"];
const iceExtras = ["Chocolate", "Morango", "Leite condensado", "Granulado", "Sem cobertura"];
const shakeSizes = [{ name: "300 ml", price: 12 }, { name: "500 ml", price: 17 }, { name: "700 ml", price: 22 }];
const shakeFlavors = ["Chocolate", "Morango", "Ovomaltine", "Leite Ninho", "Açaí", "Creme"];
const promos = [
  { id: "promo-acai", name: "Açaí 300 ml especial", detail: "Açaí, banana, granola e leite condensado", price: 16.9, tone: "from-[#5b126f] to-[#2d073b]" },
  { id: "promo-casal", name: "Combo casal", detail: "2 açaís de 500 ml com 3 adicionais cada", price: 36.9, tone: "from-[#9d285b] to-[#51103b]" },
  { id: "promo-sorvete", name: "Sorvete no copo", detail: "2 bolas, cobertura e granulado", price: 12.9, tone: "from-[#e28a34] to-[#9b3d55]" },
  { id: "promo-dia", name: "Promoção do dia", detail: "A escolha da Manu por um preço especial", price: 19.9, tone: "from-[#56337f] to-[#c83d76]" },
];
const emptyCustomer: Customer = { name: "", phone: "", deliveryType: "pickup", address: "", payment: "", notes: "" };

export function DeliveryBuilder() {
  const { addOrder } = useStore();
  const [kind, setKind] = useState<Kind | null>(null);
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [size, setSize] = useState(""); const [selectedExtras, setSelectedExtras] = useState<string[]>([]); const [acaiNote, setAcaiNote] = useState("");
  const [format, setFormat] = useState(""); const [scoop, setScoop] = useState(""); const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]); const [iceExtra, setIceExtra] = useState("");
  const [shakeSize, setShakeSize] = useState(""); const [shakeFlavor, setShakeFlavor] = useState(""); const [shakeNote, setShakeNote] = useState("");
  const [customer, setCustomer] = useState<Customer>(emptyCustomer); const [error, setError] = useState(""); const [orderId, setOrderId] = useState("");
  const building = kind === "acai" || kind === "icecream" || kind === "milkshake";
  const stepCount = kind === "icecream" ? 4 : 3;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemPrice = useMemo(() => kind === "acai"
    ? (sizes.find(x => x.name === size)?.price || 0) + selectedExtras.slice(FREE_ACAI_EXTRAS).reduce((sum, name) => sum + (extras.find(x => x.name === name)?.price || 0), 0)
    : kind === "milkshake" ? (shakeSizes.find(x => x.name === shakeSize)?.price || 0)
    : (scoops.find(x => x.name === scoop)?.price || 0) + (formats.find(x => x.name === format)?.price || 0), [kind, size, selectedExtras, scoop, format, shakeSize]);
  const reset = () => { setKind(null); setStep(0); setSize(""); setSelectedExtras([]); setAcaiNote(""); setFormat(""); setScoop(""); setSelectedFlavors([]); setIceExtra(""); setShakeSize(""); setShakeFlavor(""); setShakeNote(""); setError(""); };
  const canAdvance = kind === "acai" ? [!!size, true, true][step] : kind === "icecream" ? [!!format, !!scoop, selectedFlavors.length > 0, !!iceExtra][step] : kind === "milkshake" ? [!!shakeSize, !!shakeFlavor, true][step] : true;
  const selectFlavor = (name: string) => {
    const max = scoops.find(x => x.name === scoop)?.max || 1;
    setSelectedFlavors(current => current.includes(name) ? current.filter(x => x !== name) : current.length < max ? [...current, name] : [...current.slice(1), name]);
  };
  const addBuilt = () => {
    const isAcai = kind === "acai"; const isShake = kind === "milkshake";
    const name = isAcai ? `Açaí ${size}` : isShake ? `Milk-shake ${shakeSize} — ${shakeFlavor}` : `Sorvete ${format.toLowerCase()} · ${scoop}`;
    const included = selectedExtras.slice(0, FREE_ACAI_EXTRAS);
    const paid = selectedExtras.slice(FREE_ACAI_EXTRAS);
    const detail = isAcai ? [
      included.length ? `Adicionais inclusos: ${included.join(", ")}` : "Sem adicionais",
      paid.length ? `Adicionais pagos: ${paid.join(", ")}` : "",
      acaiNote && `Observação: ${acaiNote}`,
    ] : isShake ? [shakeNote && `Observação: ${shakeNote}`] : [...selectedFlavors, iceExtra];
    setCart(current => [...current, { id: uid(), productId: `delivery-${kind}`, name, detail: detail.filter(Boolean).join(" · "), price: itemPrice, quantity: 1 }]);
    reset();
  };
  const submit = () => {
    const validation = !customer.name.trim() ? "Informe seu nome." : !customer.phone.trim() ? "Informe seu telefone." : customer.deliveryType === "delivery" && !customer.address.trim() ? "Informe o endereço para entrega." : !customer.payment ? "Escolha uma forma de pagamento." : !cart.length ? "Adicione pelo menos um item ao pedido." : "";
    if (validation) return setError(validation);
    const id = addOrder({ customerName: customer.name.trim(), phone: customer.phone.trim(), items: cart.map(item => ({ id: item.id, productId: item.productId, productName: `${item.name} — ${item.detail}`, quantity: item.quantity, unitPrice: item.price })), notes: customer.notes.trim() || undefined, paymentMethod: customer.payment as PaymentMethod, status: "pending_payment", total, origin: "delivery", deliveryType: customer.deliveryType, address: customer.deliveryType === "delivery" ? customer.address.trim() : undefined });
    setOrderId(id);
  };
  if (orderId) return <Success id={orderId} restart={() => { setOrderId(""); setCart([]); setCustomer(emptyCustomer); reset(); }} />;

  return <main className="delivery-page min-h-screen bg-[#fbf7f0] text-[#190620]">
    <header className="sticky top-0 z-40 border-b border-[#3a0a4d]/10 bg-[#fbf7f0]/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:h-20 md:px-8"><Link href="/" aria-label="Voltar para a página inicial"><BrandLogo compact /></Link><button onClick={() => { if (cart.length) { setKind("promo"); setStep(1); } }} className="flex min-h-11 items-center gap-2 rounded-full bg-[#3a0a4d] px-4 text-sm font-bold text-white"><ShoppingBag size={18} /> {formatCurrency(total)}{cart.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#f8b900] px-1 text-[11px] text-[#24002f]">{cart.length}</span>}</button></div></header>
    {!kind ? <Start choose={setKind} cart={cart} checkout={() => { setKind("promo"); setStep(1); }} /> :
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-5 md:px-8 md:pt-8">
        <div className="mb-5 flex items-center justify-between"><button onClick={() => step === 0 ? reset() : setStep(x => x - 1)} className="flex min-h-11 items-center gap-1 text-sm font-bold text-[#4a0b63]"><ChevronLeft size={20} /> Voltar</button>{building && <div className="flex gap-2" aria-label={`Etapa ${step + 1} de ${stepCount}`}>{Array.from({ length: stepCount }).map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i <= step ? "w-7 bg-[#c83d76]" : "w-2 bg-[#dfd3df]"}`} />)}</div>}<span className="text-xs font-bold uppercase tracking-[.12em] text-[#7b6b7d]">{building ? `${step + 1}/${stepCount}` : "Seu pedido"}</span></div>
        {building ? <div className="grid gap-6 md:grid-cols-[.9fr_1.1fr] md:items-start lg:gap-12"><div className="md:sticky md:top-28"><Preview kind={kind} format={format} scoop={scoop} shakeSize={shakeSize} flavors={selectedFlavors} extras={selectedExtras} topping={kind === "milkshake" ? shakeFlavor : iceExtra} /><p className="mt-3 text-center text-sm font-bold text-[#4a0b63]">{itemPrice ? formatCurrency(itemPrice) : "Monte do seu jeito"}</p></div><section className="rounded-[28px] border border-[#eadfea] bg-white p-5 shadow-[0_20px_70px_rgba(50,8,65,.08)] md:p-8">{kind === "acai" ? <AcaiStep step={step} size={size} setSize={setSize} selected={selectedExtras} toggle={name => setSelectedExtras(current => current.includes(name) ? current.filter(x => x !== name) : [...current, name])} note={acaiNote} setNote={setAcaiNote} /> : kind === "milkshake" ? <ShakeStep step={step} size={shakeSize} setSize={setShakeSize} flavor={shakeFlavor} setFlavor={setShakeFlavor} note={shakeNote} setNote={setShakeNote} /> : <IceStep step={step} format={format} setFormat={setFormat} scoop={scoop} setScoop={value => { setScoop(value); setSelectedFlavors([]); }} selected={selectedFlavors} select={selectFlavor} extra={iceExtra} setExtra={setIceExtra} />}</section></div>
          : step === 0 ? <Promotions add={promo => { setCart(current => [...current, { id: uid(), productId: promo.id, name: promo.name, detail: promo.detail, price: promo.price, quantity: 1 }]); setStep(1); }} /> : <Checkout cart={cart} setCart={setCart} customer={customer} setCustomer={setCustomer} error={error} submit={submit} addMore={reset} />}
      </div>}
    {building && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#3a0a4d]/10 bg-[#fffaf4]/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"><button disabled={!canAdvance} onClick={() => step < stepCount - 1 ? setStep(x => x + 1) : addBuilt()} className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-[#f8b900] px-5 font-extrabold text-[#24002f] shadow-lg disabled:opacity-40">{step === stepCount - 1 ? <><Plus size={20} /> Adicionar ao pedido</> : <>Continuar <ArrowRight size={19} /></>}</button></div>}
  </main>;
}

function Start({ choose, cart, checkout }: { choose: (kind: Kind) => void; cart: CartItem[]; checkout: () => void }) {
  return <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8 md:pt-16"><div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full bg-[#f1e4f1] px-3 py-2 text-xs font-bold uppercase tracking-[.12em] text-[#6a2478]"><Sparkles size={14} /> Feito por você</span><h1 className="mt-5 text-4xl font-extrabold leading-[1.02] tracking-[-.055em] text-[#24002f] md:text-6xl">O que você quer pedir?</h1><p className="mt-4 max-w-lg leading-relaxed text-[#706273]">Monte cada detalhe e envie o pedido direto para a equipe da Manu.</p></div>
    {cart.length > 0 && <button onClick={checkout} className="mt-6 flex min-h-14 w-full items-center justify-between rounded-2xl bg-[#24002f] px-5 font-bold text-white md:max-w-md"><span>{cart.length} {cart.length === 1 ? "item no pedido" : "itens no pedido"}</span><span className="flex items-center gap-2 text-[#f8b900]">Finalizar <ArrowRight size={18} /></span></button>}
    <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Choice title="Montar açaí" text="Escolha o tamanho e até 3 adicionais grátis." color="bg-[#4a0b63]" icon={<span className="delivery-mini-bowl" />} action={() => choose("acai")} /><Choice title="Montar sorvete" text="Escolha como servir, as bolas e seus sabores." color="bg-[#c83d76]" icon={<IceCreamBowl size={40} />} action={() => choose("icecream")} /><Choice title="Milk-shake" text="Escolha o tamanho e seu sabor favorito." color="bg-[#8b573e]" icon={<span className="delivery-mini-shake" />} action={() => choose("milkshake")} /><Choice title="Promoções prontas" text="Combinações da Manu para pedir sem demora." color="bg-[#e89e00]" icon={<PackageCheck size={40} />} action={() => choose("promo")} /></div>
    <div className="mt-10 flex items-center gap-3 border-t border-[#e9dde8] pt-6 text-sm text-[#706273]"><CheckCircle2 className="text-[#c83d76]" size={20} />Pedido simples, rápido e enviado direto para a equipe.</div></div>;
}
function Choice({ title, text, color, icon, action }: { title: string; text: string; color: string; icon: React.ReactNode; action: () => void }) { return <button onClick={action} className="group relative min-h-52 overflow-hidden rounded-[28px] border border-[#eadfea] bg-white p-6 text-left shadow-[0_18px_55px_rgba(50,8,65,.07)] transition hover:-translate-y-1"><span className={`grid h-16 w-16 place-items-center rounded-2xl text-white ${color}`}>{icon}</span><h2 className="mt-6 text-xl font-extrabold tracking-[-.03em]">{title}</h2><p className="mt-2 pr-8 text-sm leading-relaxed text-[#776a79]">{text}</p><ArrowRight className="absolute bottom-6 right-6 text-[#c83d76]" size={21} /></button>; }
function Heading({ title, text }: { title: string; text: string }) { return <div className="mb-6"><h2 className="text-2xl font-extrabold tracking-[-.04em] text-[#24002f]">{title}</h2><p className="mt-2 text-sm leading-relaxed text-[#756878]">{text}</p></div>; }
function Options({ values, selected, choose }: { values: { label: string; sub?: string }[]; selected: string | string[]; choose: SetText }) { return <div className="grid grid-cols-2 gap-3">{values.map(x => { const active = Array.isArray(selected) ? selected.includes(x.label) : selected === x.label; return <button key={x.label} onClick={() => choose(x.label)} className={`relative min-h-20 rounded-2xl border p-4 text-left transition ${active ? "border-[#6d2779] bg-[#f4eaf4] shadow-[inset_0_0_0_1px_#6d2779]" : "border-[#eadfea] bg-[#fffdfb]"}`}><span className="block text-sm font-extrabold">{x.label}</span>{x.sub && <span className="mt-1 block text-xs text-[#817284]">{x.sub}</span>}{active && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[#6d2779] text-white"><Check size={12} /></span>}</button>; })}</div>; }

function AcaiStep({ step, size, setSize, selected, toggle, note, setNote }: { step: number; size: string; setSize: SetText; selected: string[]; toggle: SetText; note: string; setNote: SetText }) {
  if (step === 0) return <><Heading title="Escolha o tamanho" text="Comece pelo tamanho da sua vontade." /><Options values={sizes.map(x => ({ label: x.name, sub: formatCurrency(x.price) }))} selected={size} choose={setSize} /></>;
  if (step === 1) {
    const paid = Math.max(0, selected.length - FREE_ACAI_EXTRAS);
    return <><Heading title="Escolha até 3 adicionais grátis" text="A partir do 4º adicional, o valor de cada item é acrescentado ao total." /><div className={`mb-4 rounded-2xl p-4 text-sm font-bold ${paid ? "bg-[#fff3dc] text-[#805315]" : "bg-[#f4eaf4] text-[#5d2468]"}`}><span>{Math.min(selected.length, FREE_ACAI_EXTRAS)} de {FREE_ACAI_EXTRAS} grátis selecionados</span>{paid > 0 && <span className="mt-1 block">{paid} {paid === 1 ? "adicional pago" : "adicionais pagos"}</span>}</div><Options values={extras.map((x, index) => ({ label: x.name, sub: selected.includes(x.name) && selected.indexOf(x.name) >= FREE_ACAI_EXTRAS ? `Pago: ${formatCurrency(x.price)}` : index >= 0 ? `Após o 3º: ${formatCurrency(x.price)}` : undefined }))} selected={selected} choose={toggle} /></>;
  }
  return <><Heading title="Alguma observação?" text="Este campo é opcional." /><label className="grid gap-2 text-sm font-bold">Observação<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: pouco leite condensado, sem colher..." rows={4} className="rounded-2xl border border-[#dfd2df] p-4 font-normal outline-none focus:border-[#6d2779]" /></label></>;
}
function IceStep({ step, format, setFormat, scoop, setScoop, selected, select, extra, setExtra }: { step: number; format: string; setFormat: SetText; scoop: string; setScoop: SetText; selected: string[]; select: SetText; extra: string; setExtra: SetText }) {
  if (step === 0) return <><Heading title="Como você quer?" text="Escolha onde vamos servir seu sorvete." /><Options values={formats.map(x => ({ label: x.name, sub: x.price ? `+ ${formatCurrency(x.price)}` : undefined }))} selected={format} choose={setFormat} /></>;
  if (step === 1) return <><Heading title="Quantas bolas?" text="Escolha o tamanho do seu sorvete." /><Options values={scoops.map(x => ({ label: x.name, sub: formatCurrency(x.price) }))} selected={scoop} choose={setScoop} /></>;
  if (step === 2) return <><Heading title="Escolha os sabores" text={`Você pode escolher até ${scoops.find(x => x.name === scoop)?.max || 1} sabores.`} /><Options values={flavors.map(label => ({ label }))} selected={selected} choose={select} /></>;
  return <><Heading title="O toque final" text="Escolha uma cobertura ou adicional." /><Options values={iceExtras.map(label => ({ label }))} selected={extra} choose={setExtra} /></>;
}
function ShakeStep({ step, size, setSize, flavor, setFlavor, note, setNote }: { step: number; size: string; setSize: SetText; flavor: string; setFlavor: SetText; note: string; setNote: SetText }) {
  if (step === 0) return <><Heading title="Escolha o tamanho" text="Qual tamanho combina com a sua vontade?" /><Options values={shakeSizes.map(x => ({ label: x.name, sub: formatCurrency(x.price) }))} selected={size} choose={setSize} /></>;
  if (step === 1) return <><Heading title="Escolha o sabor" text="Seu milk-shake começa por aqui." /><Options values={shakeFlavors.map(label => ({ label }))} selected={flavor} choose={setFlavor} /></>;
  return <><Heading title="Alguma observação?" text="Este campo é opcional." /><label className="grid gap-2 text-sm font-bold">Observação<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: sem canudo..." rows={4} className="rounded-2xl border border-[#dfd2df] p-4 font-normal outline-none focus:border-[#6d2779]" /></label></>;
}

function Preview({ kind, format, scoop, shakeSize, flavors: chosen, extras: chosenExtras, topping }: { kind: Kind; format: string; scoop: string; shakeSize: string; flavors: string[]; extras: string[]; topping: string }) {
  const colors: Record<string, string> = { Chocolate: "#6b3528", Morango: "#e67b91", Creme: "#f5dca6", Flocos: "#e8dfd1", Napolitano: "#d99887", "Açaí": "#4b164f" };
  const scoopCount = scoops.find(item => item.name === scoop)?.max || 1;
  return <div className="delivery-preview relative mx-auto grid aspect-[4/3] max-h-[330px] w-full max-w-md place-items-center overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_50%_35%,#fff_0%,#f5e8ee_48%,#ead8e7_100%)]">
    <div className="absolute left-5 top-5 rounded-full bg-white/75 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6e3974]">Sua prévia</div>
    {kind === "acai" ? <div className="acai-cup"><span className="acai-fill" /><span className="acai-top" />{chosenExtras.includes("Banana") && <span className="fruit fruit-banana" />}{chosenExtras.includes("Morango") && <span className="fruit fruit-strawberry" />}{chosenExtras.includes("Granola") && <span className="granola">••••••</span>}{(chosenExtras.includes("Leite condensado") || topping === "Leite condensado") && <span className="sauce sauce-light" />}{topping === "Chocolate" && <span className="sauce sauce-dark" />}{topping === "Morango" && <span className="sauce sauce-pink" />}</div>
      : kind === "milkshake" ? <div className={`shake-cup ${shakeSize === "300 ml" ? "shake-small" : shakeSize === "700 ml" ? "shake-large" : ""}`} style={{ "--shake-color": colors[topping] || (topping === "Ovomaltine" ? "#8c5b32" : topping === "Leite Ninho" ? "#f2e5c6" : "#d9b873") } as React.CSSProperties}><span className="shake-straw" /><span className="shake-liquid" /></div>
      : <div className={`ice-vessel ${format === "Casquinha" ? "is-cone" : ""}`}><span className="vessel-base" /><span className="scoops">{Array.from({ length: scoopCount }).map((_, i) => <i key={i} style={{ background: chosen[i] ? colors[chosen[i]] : "#ead3b1" }} />)}</span>{topping && topping !== "Sem cobertura" && <span className={`ice-drip ${topping === "Morango" ? "pink" : topping === "Leite condensado" ? "light" : ""}`} />}</div>}
  </div>;
}

function Promotions({ add }: { add: (promo: typeof promos[number]) => void }) {
  return <section><Heading title="Promoções prontas" text="Escolha uma combinação e siga para os dados do pedido." /><div className="grid gap-4 md:grid-cols-2">{promos.map(promo => <article key={promo.id} className={`relative min-h-56 overflow-hidden rounded-[28px] bg-gradient-to-br p-6 text-white shadow-lg ${promo.tone}`}><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" /><span className="text-xs font-bold uppercase tracking-[.14em] text-[#ffd75c]">Escolha da Manu</span><h3 className="mt-5 text-2xl font-extrabold tracking-[-.04em]">{promo.name}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">{promo.detail}</p><div className="mt-6 flex items-center justify-between"><strong className="text-xl">{formatCurrency(promo.price)}</strong><button onClick={() => add(promo)} className="min-h-11 rounded-full bg-[#f8b900] px-5 text-sm font-extrabold text-[#24002f]">Pedir agora</button></div></article>)}</div></section>;
}

function Checkout({ cart, setCart, customer, setCustomer, error, submit, addMore }: { cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; customer: Customer; setCustomer: React.Dispatch<React.SetStateAction<Customer>>; error: string; submit: () => void; addMore: () => void }) {
  const total = cart.reduce((sum, x) => sum + x.price * x.quantity, 0);
  const update = (patch: Partial<Customer>) => setCustomer(current => ({ ...current, ...patch }));
  return <div className="grid gap-3 pb-3 md:gap-6 lg:grid-cols-[.85fr_1.15fr]">
    <section className="rounded-[20px] border border-[#eadfea] bg-white p-4 md:rounded-[28px] md:p-5 lg:sticky lg:top-28 lg:self-start"><div className="mb-3 flex items-center justify-between md:mb-6 md:block"><div><h2 className="text-lg font-extrabold tracking-[-.03em] text-[#24002f] md:text-2xl">Seu pedido</h2><p className="hidden mt-2 text-sm text-[#756878] md:block">Confira os itens antes de enviar.</p></div><strong className="text-base text-[#24002f] md:hidden">{formatCurrency(total)}</strong></div><div className="grid gap-2 md:gap-3">{cart.map(item => <div key={item.id} className="rounded-xl bg-[#faf4f8] p-3 md:rounded-2xl md:p-4"><div className="flex justify-between gap-3"><div><h3 className="text-sm font-extrabold">{item.name}</h3><p className="mt-1 text-[11px] leading-snug text-[#796b7b] md:text-xs md:leading-relaxed">{item.detail}</p></div><button aria-label={`Remover ${item.name}`} onClick={() => setCart(current => current.filter(x => x.id !== item.id))} className="h-8 text-[#a44b70]"><Trash2 size={16} /></button></div><div className="mt-2 flex items-center justify-between md:mt-3"><div className="flex items-center gap-3"><button aria-label="Diminuir quantidade" onClick={() => setCart(current => current.map(x => x.id === item.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}><Minus size={16} /></button><strong className="text-sm">{item.quantity}</strong><button aria-label="Aumentar quantidade" onClick={() => setCart(current => current.map(x => x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x))}><Plus size={16} /></button></div><strong className="text-sm md:text-base">{formatCurrency(item.price * item.quantity)}</strong></div></div>)}</div>
      {cart.length === 0 && <p className="rounded-xl bg-[#faf4f8] p-4 text-sm text-[#796b7b] md:rounded-2xl md:p-5">Seu pedido está vazio. Adicione um item para continuar.</p>}<button onClick={addMore} className="mt-2 flex min-h-10 items-center gap-2 text-xs font-extrabold text-[#6d2779] md:mt-4 md:min-h-11 md:text-sm"><Plus size={16} /> Adicionar outro item</button><div className="mt-4 hidden justify-between border-t border-[#eadfea] pt-5 text-lg md:flex"><strong>Total estimado</strong><strong>{formatCurrency(total)}</strong></div>
    </section>
    <section className="rounded-[20px] border border-[#eadfea] bg-white p-4 md:rounded-[28px] md:p-8"><div className="mb-3 md:mb-6"><h2 className="text-lg font-extrabold tracking-[-.03em] text-[#24002f] md:text-2xl">Finalizar pedido</h2><p className="mt-1 text-xs text-[#756878] md:mt-2 md:text-sm">Informe como prefere receber.</p></div><div className="grid gap-3 md:gap-4"><div className="grid grid-cols-2 gap-3"><Field label="Nome" value={customer.name} change={value => update({ name: value })} placeholder="Seu nome" /><Field label="Telefone" value={customer.phone} change={value => update({ phone: value })} placeholder="(00) 00000-0000" type="tel" /></div>
      <fieldset><legend className="mb-1.5 text-xs font-bold md:mb-2 md:text-sm">Tipo do pedido</legend><div className="grid grid-cols-2 gap-2 md:gap-3"><DeliveryOption active={customer.deliveryType === "pickup"} action={() => update({ deliveryType: "pickup" })} icon={<PackageCheck />} title="Retirada" /><DeliveryOption active={customer.deliveryType === "delivery"} action={() => update({ deliveryType: "delivery" })} icon={<Truck />} title="Entrega" /></div></fieldset>
      {customer.deliveryType === "delivery" && <Field label="Endereço de entrega" value={customer.address} change={value => update({ address: value })} placeholder="Rua, número e bairro" />}
      <label className="grid gap-2 text-sm font-bold">Forma de pagamento<select value={customer.payment} onChange={e => update({ payment: e.target.value as PaymentMethod })} className="min-h-13 rounded-xl border border-[#dfd2df] bg-white px-4 font-normal outline-none focus:border-[#6d2779]"><option value="">Escolha uma opção</option>{["Pix", "Dinheiro", "Cartão", "Fiado/Outro"].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Alguma observação?<textarea value={customer.notes} onChange={e => update({ notes: e.target.value })} placeholder="Ex.: sem colher, troco para R$ 50..." rows={3} className="rounded-xl border border-[#dfd2df] p-4 font-normal outline-none focus:border-[#6d2779]" /></label></div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#fff0f3] p-3 text-sm font-bold text-[#a52d54]">{error}</p>}<button disabled={!cart.length} onClick={submit} className="mt-6 hidden min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#f8b900] px-5 font-extrabold text-[#24002f] disabled:opacity-40 md:flex">Enviar pedido <ArrowRight size={19} /></button><p className="mt-3 hidden text-center text-xs text-[#817284] md:block">Seu pedido será enviado direto para a equipe da Manu.</p>
    </section>
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#3a0a4d]/10 bg-[#fffaf4]/95 p-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"><div className="flex items-center gap-3"><div className="min-w-[84px]"><span className="block text-[10px] font-bold uppercase tracking-wider text-[#817284]">Total</span><strong className="text-base text-[#24002f]">{formatCurrency(total)}</strong></div><button disabled={!cart.length} onClick={submit} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f8b900] px-4 text-sm font-extrabold text-[#24002f] disabled:opacity-40">Enviar pedido <ArrowRight size={18} /></button></div></div>
  </div>;
}
function Field({ label, value, change, placeholder, type = "text" }: { label: string; value: string; change: SetText; placeholder: string; type?: string }) { return <label className="grid min-w-0 gap-1.5 text-xs font-bold md:gap-2 md:text-sm">{label}<input type={type} value={value} onChange={e => change(e.target.value)} placeholder={placeholder} className="min-h-11 min-w-0 rounded-xl border border-[#dfd2df] px-3 text-sm font-normal outline-none focus:border-[#6d2779] md:min-h-13 md:px-4" /></label>; }
function DeliveryOption({ active, action, icon, title }: { active: boolean; action: () => void; icon: React.ReactNode; title: string }) { return <button type="button" onClick={action} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border text-xs font-extrabold md:min-h-20 md:rounded-2xl md:text-sm ${active ? "border-[#6d2779] bg-[#f4eaf4] text-[#4a0b63]" : "border-[#dfd2df] text-[#766878]"}`}>{icon}{title}</button>; }
function Success({ id, restart }: { id: string; restart: () => void }) { return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_20%,#5b126f,#24002f_62%)] px-5 text-white"><div className="w-full max-w-lg text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#f8b900] text-[#24002f] shadow-[0_0_0_12px_rgba(248,185,0,.1)]"><Check size={36} strokeWidth={3} /></span><p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[#f8b900]">Tudo certo</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.05em]">Pedido enviado</h1><p className="mx-auto mt-4 max-w-sm leading-relaxed text-white/70">Seu pedido chegou para a equipe da Manu. Se necessário, a confirmação será feita pelo WhatsApp.</p><div className="mx-auto mt-7 max-w-xs rounded-2xl border border-white/10 bg-white/10 p-4"><span className="text-xs text-white/60">Número do pedido</span><strong className="mt-1 block text-xl">#{id.slice(0, 8).toUpperCase()}</strong></div><button onClick={restart} className="mt-8 min-h-14 rounded-full bg-[#f8b900] px-8 font-extrabold text-[#24002f]">Fazer novo pedido</button><Link href="/" className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-white/70"><ArrowLeft size={17} /> Voltar ao início</Link></div></main>; }
