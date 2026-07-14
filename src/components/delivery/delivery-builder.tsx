"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, CreditCard, IceCreamBowl, MapPin, MessageCircle, Minus, PackageCheck, Plus, ShoppingBag, Sparkles, Trash2, Truck, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useStore } from "@/components/store-provider";
import { ConfigurableItem, PaymentMethod, Promotion, StoreSettings } from "@/lib/types";
import { formatCurrency, toDateInput, uid } from "@/lib/utils";
import { formatPhone, isValidPhone } from "@/lib/phone";
import { createPublicOrderCode } from "@/lib/order-code";
import { getStoreAvailability, paymentLabels } from "@/lib/settings";

type Kind = "acai" | "icecream" | "milkshake" | "promo";
type CartItem = { id: string; productId: string; name: string; detail: string; price: number; quantity: number };
type Customer = { name: string; phone: string; deliveryType: "pickup" | "delivery" | ""; address: string; payment: PaymentMethod | ""; notes: string };
type SetText = (value: string) => void;
const freeAddOnsLabel = (quantity: number) => `${quantity} ${quantity === 1 ? "adicional grátis" : "adicionais grátis"}`;
type CheckoutStage = "review" | "delivery" | "address" | "name" | "phone" | "payment" | "note" | "confirm";

const sizes = [{ name: "300 ml", price: 14 }, { name: "500 ml", price: 19 }, { name: "700 ml", price: 25 }, { name: "1 litro", price: 34 }];
const formats = [{ name: "Copo", price: 0 }, { name: "Casquinha", price: 0 }];
const scoops = [{ name: "1 bola", price: 7, max: 1 }, { name: "2 bolas", price: 12, max: 2 }, { name: "3 bolas", price: 16, max: 3 }];
const iceExtras = ["Chocolate", "Morango", "Leite condensado", "Granulado", "Sem cobertura"];
const shakeSizes = [{ name: "300 ml", price: 12 }, { name: "500 ml", price: 17 }, { name: "700 ml", price: 22 }];
const emptyCustomer: Customer = { name: "", phone: "", deliveryType: "", address: "", payment: "", notes: "" };

export function DeliveryBuilder() {
  const { addOrder, settings } = useStore();
  const [availabilityNow, setAvailabilityNow] = useState(() => new Date());
  const [kind, setKind] = useState<Kind | null>(null);
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [size, setSize] = useState(""); const [selectedExtras, setSelectedExtras] = useState<string[]>([]); const [acaiNote, setAcaiNote] = useState("");
  const [format, setFormat] = useState(""); const [scoop, setScoop] = useState(""); const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]); const [iceExtra, setIceExtra] = useState("");
  const [shakeSize, setShakeSize] = useState(""); const [shakeFlavor, setShakeFlavor] = useState(""); const [shakeNote, setShakeNote] = useState("");
  const [customer, setCustomer] = useState<Customer>(emptyCustomer); const [error, setError] = useState(""); const [orderId, setOrderId] = useState("");
  const building = kind === "acai" || kind === "icecream" || kind === "milkshake";
  const stepCount = kind === "icecream" ? 4 : 3;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = customer.deliveryType === "delivery" ? settings.delivery.fee : 0;
  const total = subtotal + deliveryFee;
  const availability = getStoreAvailability(settings, availabilityNow);
  const freeAcaiExtras = settings.delivery.freeAddOnsQuantity;
  const extras = settings.acaiExtras.filter((item) => item.active !== false && item.available && item.name.trim());
  const flavors = settings.iceCreamFlavors.filter((item) => item.active !== false && item.available && item.name.trim());
  const shakeFlavors = settings.milkshakeFlavors.filter((item) => item.active !== false && item.available && item.name.trim());
  const today = toDateInput(new Date());
  const promotions = settings.promotions.filter((promotion) =>
    promotion.active
    && promotion.title.trim()
    && promotion.price > 0
    && (!promotion.validFrom || promotion.validFrom.slice(0, 10) <= today)
    && (!promotion.validUntil || promotion.validUntil.slice(0, 10) >= today),
  );
  const acceptedPayments = (Object.keys(settings.payments.accepted) as PaymentMethod[])
    .filter((method) => settings.payments.accepted[method]);
  const flavorColors = Object.fromEntries(
    [...settings.iceCreamFlavors, ...settings.milkshakeFlavors].map((flavor) => [flavor.name, flavor.previewColor]),
  );
  useEffect(() => {
    const timer = window.setInterval(() => setAvailabilityNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const itemPrice = useMemo(() => kind === "acai"
    ? (sizes.find(x => x.name === size)?.price || 0) + selectedExtras.slice(freeAcaiExtras).reduce((sum, name) => sum + (extras.find(x => x.name === name)?.extraPrice || 0), 0)
    : kind === "milkshake" ? (shakeSizes.find(x => x.name === shakeSize)?.price || 0)
    : (scoops.find(x => x.name === scoop)?.price || 0) + (formats.find(x => x.name === format)?.price || 0), [kind, size, selectedExtras, scoop, format, shakeSize, extras, freeAcaiExtras]);
  const reset = () => { setKind(null); setStep(0); setSize(""); setSelectedExtras([]); setAcaiNote(""); setFormat(""); setScoop(""); setSelectedFlavors([]); setIceExtra(""); setShakeSize(""); setShakeFlavor(""); setShakeNote(""); setError(""); };
  const canAdvance = kind === "acai" ? [!!size, true, true][step] : kind === "icecream" ? [!!format, !!scoop, selectedFlavors.length > 0, !!iceExtra][step] : kind === "milkshake" ? [!!shakeSize, !!shakeFlavor, true][step] : true;
  const selectFlavor = (name: string) => {
    const max = scoops.find(x => x.name === scoop)?.max || 1;
    setSelectedFlavors(current => current.includes(name) ? current.filter(x => x !== name) : current.length < max ? [...current, name] : [...current.slice(1), name]);
  };
  const addBuilt = () => {
    const isAcai = kind === "acai"; const isShake = kind === "milkshake";
    const name = isAcai ? `Açaí ${size}` : isShake ? `Milk-shake ${shakeSize} — ${shakeFlavor}` : `Sorvete ${format.toLowerCase()} · ${scoop}`;
    const included = selectedExtras.slice(0, freeAcaiExtras);
    const paid = selectedExtras.slice(freeAcaiExtras);
    const detail = isAcai ? [
      included.length ? `Adicionais inclusos: ${included.join(", ")}` : "Sem adicionais",
      paid.length ? `Adicionais pagos: ${paid.join(", ")}` : "",
      acaiNote && `Observação: ${acaiNote}`,
    ] : isShake ? [shakeNote && `Observação: ${shakeNote}`] : [...selectedFlavors, iceExtra];
    setCart(current => [...current, { id: uid(), productId: `delivery-${kind}`, name, detail: detail.filter(Boolean).join(" · "), price: itemPrice, quantity: 1 }]);
    reset();
  };
  const submit = () => {
    const currentAvailability = getStoreAvailability(settings);
    const validation = !currentAvailability.acceptingOrders ? currentAvailability.message
      : !customer.deliveryType ? "Escolha como você quer receber."
      : customer.deliveryType === "pickup" && !settings.status.allowPickup ? "A retirada não está disponível no momento."
      : customer.deliveryType === "delivery" && !settings.status.allowDelivery ? "A entrega não está disponível no momento."
      : customer.deliveryType === "delivery" && !customer.address.trim() ? "Informe o endereço para entrega."
      : !customer.name.trim() ? "Informe seu nome."
      : !customer.phone.trim() ? "Informe seu telefone."
      : !isValidPhone(customer.phone) ? "Informe um telefone válido com DDD."
      : !customer.payment ? "Escolha uma forma de pagamento."
      : !acceptedPayments.includes(customer.payment as PaymentMethod) ? "A forma de pagamento escolhida não está disponível."
      : !cart.length ? "Adicione pelo menos um item ao pedido."
      : subtotal < settings.delivery.minimumOrder ? `O pedido mínimo é de ${formatCurrency(settings.delivery.minimumOrder)}.` : "";
    if (validation) return setError(validation);
    const id = addOrder({ customerName: customer.name.trim(), phone: customer.phone.trim(), items: cart.map(item => ({ id: item.id, productId: item.productId, productName: `${item.name} — ${item.detail}`, quantity: item.quantity, unitPrice: item.price })), notes: customer.notes.trim() || undefined, paymentMethod: customer.payment as PaymentMethod, paymentStatus: "pending", orderStatus: "new", status: "pending_payment", total, origin: "delivery", deliveryType: customer.deliveryType as "pickup" | "delivery", deliveryFee: customer.deliveryType === "delivery" ? deliveryFee : 0, address: customer.deliveryType === "delivery" ? customer.address.trim() : undefined });
    setOrderId(id);
  };
  if (orderId) return <Success id={orderId} restart={() => { setOrderId(""); setCart([]); setCustomer(emptyCustomer); reset(); }} />;

  return <main className="delivery-page min-h-screen bg-[#fbf7f0] text-[#190620]">
    <header className="sticky top-0 z-40 border-b border-[#3a0a4d]/10 bg-[#fbf7f0]/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 md:h-20 md:px-8"><div className="flex min-w-0 items-center gap-2.5"><Link href="/" aria-label="Voltar para a página inicial"><BrandLogo compact /></Link><span aria-label={availability.message} title={availability.message} className={`inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-extrabold uppercase tracking-[.08em] ${availability.acceptingOrders ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}><i className={`h-1.5 w-1.5 rounded-full ${availability.acceptingOrders ? "bg-emerald-500" : "bg-amber-500"}`} />{availability.acceptingOrders ? "Aberto" : "Pausado"}</span></div><button onClick={() => { if (cart.length) { setKind("promo"); setStep(1); } }} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#3a0a4d] px-3.5 text-sm font-bold text-white"><ShoppingBag size={18} /> {formatCurrency(total)}{cart.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#f8b900] px-1 text-[11px] text-[#24002f]">{cart.length}</span>}</button></div></header>
    {!kind ? <Start choose={setKind} cart={cart} checkout={() => { setKind("promo"); setStep(1); }} availability={availability} hasPromotions={promotions.length > 0} freeAddOns={freeAcaiExtras} /> :
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-5 md:px-8 md:pt-8">
        {(building || step === 0) && <div className="mb-5 flex items-center justify-between"><button onClick={() => step === 0 ? reset() : setStep(x => x - 1)} className="flex min-h-11 items-center gap-1 text-sm font-bold text-[#4a0b63]"><ChevronLeft size={20} /> Voltar</button>{building && <div className="flex gap-2" aria-label={`Etapa ${step + 1} de ${stepCount}`}>{Array.from({ length: stepCount }).map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i <= step ? "w-7 bg-[#c83d76]" : "w-2 bg-[#dfd3df]"}`} />)}</div>}<span className="text-xs font-bold uppercase tracking-[.12em] text-[#7b6b7d]">{building ? `${step + 1}/${stepCount}` : "Promoções"}</span></div>}
        {building ? <div className="grid gap-6 md:grid-cols-[.9fr_1.1fr] md:items-start lg:gap-12"><div className="md:sticky md:top-28"><Preview kind={kind} format={format} scoop={scoop} shakeSize={shakeSize} flavors={selectedFlavors} extras={selectedExtras} topping={kind === "milkshake" ? shakeFlavor : iceExtra} flavorColors={flavorColors} /><p className="mt-3 text-center text-sm font-bold text-[#4a0b63]">{itemPrice ? formatCurrency(itemPrice) : "Monte do seu jeito"}</p></div><section className="rounded-[28px] border border-[#eadfea] bg-white p-5 shadow-[0_20px_70px_rgba(50,8,65,.08)] md:p-8">{kind === "acai" ? <AcaiStep step={step} size={size} setSize={setSize} selected={selectedExtras} toggle={name => setSelectedExtras(current => current.includes(name) ? current.filter(x => x !== name) : [...current, name])} note={acaiNote} setNote={setAcaiNote} extras={extras} freeAddOns={freeAcaiExtras} /> : kind === "milkshake" ? <ShakeStep step={step} size={shakeSize} setSize={setShakeSize} flavor={shakeFlavor} setFlavor={setShakeFlavor} note={shakeNote} setNote={setShakeNote} flavors={shakeFlavors} /> : <IceStep step={step} format={format} setFormat={setFormat} scoop={scoop} setScoop={value => { setScoop(value); setSelectedFlavors([]); }} selected={selectedFlavors} select={selectFlavor} extra={iceExtra} setExtra={setIceExtra} flavors={flavors} />}</section></div>
          : step === 0 ? <Promotions promotions={promotions} add={promo => { setCart(current => [...current, { id: uid(), productId: promo.id, name: promo.title, detail: promo.description, price: promo.price, quantity: 1 }]); setStep(1); }} /> : <Checkout cart={cart} setCart={setCart} customer={customer} setCustomer={setCustomer} error={error} submit={submit} addMore={reset} deliveryFee={deliveryFee} acceptedPayments={acceptedPayments} settings={settings} canSubmit={availability.acceptingOrders} availabilityMessage={availability.message} />}
      </div>}
    {building && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#3a0a4d]/10 bg-[#fffaf4]/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"><button disabled={!canAdvance} onClick={() => step < stepCount - 1 ? setStep(x => x + 1) : addBuilt()} className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-[#f8b900] px-5 font-extrabold text-[#24002f] shadow-lg disabled:opacity-40">{step === stepCount - 1 ? <><Plus size={20} /> Adicionar ao pedido</> : <>Continuar <ArrowRight size={19} /></>}</button></div>}
  </main>;
}

function Start({ choose, cart, checkout, availability, hasPromotions, freeAddOns }: { choose: (kind: Kind) => void; cart: CartItem[]; checkout: () => void; availability: ReturnType<typeof getStoreAvailability>; hasPromotions: boolean; freeAddOns: number }) {
  return <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-8 md:pt-10"><div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full bg-[#f1e4f1] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#6a2478] md:text-xs"><Sparkles size={13} /> Feito por você</span><h1 className="mt-3 text-[2rem] font-extrabold leading-[1.02] tracking-[-.055em] text-[#24002f] min-[390px]:text-4xl md:mt-5 md:text-6xl">O que você quer pedir?</h1><p className="mt-2 max-w-lg text-sm leading-relaxed text-[#706273] md:mt-4 md:text-base">Monte cada detalhe e envie o pedido direto para a equipe da Manu.</p>{!availability.acceptingOrders && <p className="mt-3 flex max-w-xl items-start gap-2 text-xs font-semibold leading-relaxed text-amber-800"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{availability.message}</p>}</div>
    {cart.length > 0 && <button onClick={checkout} className="mt-4 flex min-h-13 w-full items-center justify-between rounded-2xl bg-[#24002f] px-5 font-bold text-white md:mt-6 md:max-w-md"><span>{cart.length} {cart.length === 1 ? "item no pedido" : "itens no pedido"}</span><span className="flex items-center gap-2 text-[#f8b900]">Finalizar <ArrowRight size={18} /></span></button>}
    <div className="mt-5 grid grid-cols-2 gap-3 md:mt-9 md:gap-4 lg:grid-cols-4"><Choice title="Montar açaí" text={`Tamanho e até ${freeAddOnsLabel(freeAddOns)}.`} color="bg-[#4a0b63]" icon={<span className="delivery-mini-bowl" />} action={() => choose("acai")} /><Choice title="Montar sorvete" text="Tipo, bolas e sabores." color="bg-[#c83d76]" icon={<IceCreamBowl size={32} className="md:h-10 md:w-10" />} action={() => choose("icecream")} /><Choice title="Milk-shake" text="Tamanho e sabor favorito." color="bg-[#8b573e]" icon={<span className="delivery-mini-shake" />} action={() => choose("milkshake")} />{hasPromotions && <Choice title="Promoções" text="Combinações prontas para pedir." color="bg-[#e89e00]" icon={<PackageCheck size={32} className="md:h-10 md:w-10" />} action={() => choose("promo")} />}</div>
    <div className="mt-10 flex items-center gap-3 border-t border-[#e9dde8] pt-6 text-sm text-[#706273]"><CheckCircle2 className="text-[#c83d76]" size={20} />Pedido simples, rápido e enviado direto para a equipe.</div></div>;
}
function Choice({ title, text, color, icon, action }: { title: string; text: string; color: string; icon: React.ReactNode; action: () => void }) { return <button onClick={action} className="group relative min-h-44 overflow-hidden rounded-[22px] border border-[#eadfea] bg-white p-4 text-left shadow-[0_12px_38px_rgba(50,8,65,.06)] transition hover:-translate-y-1 md:min-h-52 md:rounded-[28px] md:p-6 md:shadow-[0_18px_55px_rgba(50,8,65,.07)]"><span className={`grid h-12 w-12 place-items-center rounded-xl text-white md:h-16 md:w-16 md:rounded-2xl ${color}`}>{icon}</span><h2 className="mt-4 text-base font-extrabold leading-tight tracking-[-.03em] md:mt-6 md:text-xl">{title}</h2><p className="mt-1.5 pr-3 text-xs leading-relaxed text-[#776a79] md:mt-2 md:pr-8 md:text-sm">{text}</p><ArrowRight className="absolute bottom-4 right-4 text-[#c83d76] md:bottom-6 md:right-6" size={18} /></button>; }
function Heading({ title, text }: { title: string; text: string }) { return <div className="mb-6"><h2 className="text-2xl font-extrabold tracking-[-.04em] text-[#24002f]">{title}</h2><p className="mt-2 text-sm leading-relaxed text-[#756878]">{text}</p></div>; }
function Options({ values, selected, choose }: { values: { label: string; sub?: string }[]; selected: string | string[]; choose: SetText }) { return <div className="grid grid-cols-2 gap-3">{values.map(x => { const active = Array.isArray(selected) ? selected.includes(x.label) : selected === x.label; return <button key={x.label} onClick={() => choose(x.label)} className={`relative min-h-20 rounded-2xl border p-4 text-left transition ${active ? "border-[#6d2779] bg-[#f4eaf4] shadow-[inset_0_0_0_1px_#6d2779]" : "border-[#eadfea] bg-[#fffdfb]"}`}><span className="block text-sm font-extrabold">{x.label}</span>{x.sub && <span className="mt-1 block text-xs text-[#817284]">{x.sub}</span>}{active && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[#6d2779] text-white"><Check size={12} /></span>}</button>; })}</div>; }

function AcaiStep({ step, size, setSize, selected, toggle, note, setNote, extras, freeAddOns }: { step: number; size: string; setSize: SetText; selected: string[]; toggle: SetText; note: string; setNote: SetText; extras: ConfigurableItem[]; freeAddOns: number }) {
  if (step === 0) return <><Heading title="Escolha o tamanho" text="Comece pelo tamanho da sua vontade." /><Options values={sizes.map(x => ({ label: x.name, sub: formatCurrency(x.price) }))} selected={size} choose={setSize} /></>;
  if (step === 1) {
    const paid = Math.max(0, selected.length - freeAddOns);
    return <><Heading title={`Escolha até ${freeAddOnsLabel(freeAddOns)}`} text={`A partir do ${freeAddOns + 1}º adicional, o valor de cada item é acrescentado ao total.`} /><div className={`mb-4 rounded-2xl p-4 text-sm font-bold ${paid ? "bg-[#fff3dc] text-[#805315]" : "bg-[#f4eaf4] text-[#5d2468]"}`}><span>{Math.min(selected.length, freeAddOns)} de {freeAddOns} grátis {freeAddOns === 1 ? "selecionado" : "selecionados"}</span>{paid > 0 && <span className="mt-1 block">{paid} {paid === 1 ? "adicional pago" : "adicionais pagos"}</span>}</div><Options values={extras.map((x) => ({ label: x.name, sub: selected.includes(x.name) && selected.indexOf(x.name) >= freeAddOns ? `Pago: ${formatCurrency(x.extraPrice ?? 0)}` : `Após o ${freeAddOns}º: ${formatCurrency(x.extraPrice ?? 0)}` }))} selected={selected} choose={toggle} /></>;
  }
  return <><Heading title="Alguma observação?" text="Este campo é opcional." /><label className="grid gap-2 text-sm font-bold">Observação<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: pouco leite condensado, sem colher..." rows={4} className="rounded-2xl border border-[#dfd2df] p-4 font-normal outline-none focus:border-[#6d2779]" /></label></>;
}
function IceStep({ step, format, setFormat, scoop, setScoop, selected, select, extra, setExtra, flavors }: { step: number; format: string; setFormat: SetText; scoop: string; setScoop: SetText; selected: string[]; select: SetText; extra: string; setExtra: SetText; flavors: ConfigurableItem[] }) {
  if (step === 0) return <><Heading title="Como você quer?" text="Escolha onde vamos servir seu sorvete." /><Options values={formats.map(x => ({ label: x.name, sub: x.price ? `+ ${formatCurrency(x.price)}` : undefined }))} selected={format} choose={setFormat} /></>;
  if (step === 1) return <><Heading title="Quantas bolas?" text="Escolha o tamanho do seu sorvete." /><Options values={scoops.map(x => ({ label: x.name, sub: formatCurrency(x.price) }))} selected={scoop} choose={setScoop} /></>;
  if (step === 2) return <><Heading title="Escolha os sabores" text={`Você pode escolher até ${scoops.find(x => x.name === scoop)?.max || 1} sabores.`} />{flavors.length ? <Options values={flavors.map((flavor) => ({ label: flavor.name }))} selected={selected} choose={select} /> : <UnavailableOption text="Nenhum sabor de sorvete está disponível no momento." />}</>;
  return <><Heading title="O toque final" text="Escolha uma cobertura ou adicional." /><Options values={iceExtras.map(label => ({ label }))} selected={extra} choose={setExtra} /></>;
}
function ShakeStep({ step, size, setSize, flavor, setFlavor, note, setNote, flavors }: { step: number; size: string; setSize: SetText; flavor: string; setFlavor: SetText; note: string; setNote: SetText; flavors: ConfigurableItem[] }) {
  if (step === 0) return <><Heading title="Escolha o tamanho" text="Qual tamanho combina com a sua vontade?" /><Options values={shakeSizes.map(x => ({ label: x.name, sub: formatCurrency(x.price) }))} selected={size} choose={setSize} /></>;
  if (step === 1) return <><Heading title="Escolha o sabor" text="Seu milk-shake começa por aqui." />{flavors.length ? <Options values={flavors.map((item) => ({ label: item.name }))} selected={flavor} choose={setFlavor} /> : <UnavailableOption text="Nenhum sabor de milk-shake está disponível no momento." />}</>;
  return <><Heading title="Alguma observação?" text="Este campo é opcional." /><label className="grid gap-2 text-sm font-bold">Observação<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: sem canudo..." rows={4} className="rounded-2xl border border-[#dfd2df] p-4 font-normal outline-none focus:border-[#6d2779]" /></label></>;
}

function Preview({ kind, format, scoop, shakeSize, flavors: chosen, extras: chosenExtras, topping, flavorColors }: { kind: Kind; format: string; scoop: string; shakeSize: string; flavors: string[]; extras: string[]; topping: string; flavorColors: Record<string, string | undefined> }) {
  const colors: Record<string, string | undefined> = { Chocolate: "#6b3528", Morango: "#e67b91", Creme: "#f5dca6", Flocos: "#e8dfd1", Napolitano: "#d99887", "Açaí": "#4b164f", ...flavorColors };
  const scoopCount = scoops.find(item => item.name === scoop)?.max || 1;
  return <div className="delivery-preview relative mx-auto grid aspect-[4/3] max-h-[330px] w-full max-w-md place-items-center overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_50%_35%,#fff_0%,#f5e8ee_48%,#ead8e7_100%)]">
    <div className="absolute left-5 top-5 rounded-full bg-white/75 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6e3974]">Sua prévia</div>
    {kind === "acai" ? <div className="acai-cup"><span className="acai-fill" /><span className="acai-top" />{chosenExtras.includes("Banana") && <span className="fruit fruit-banana" />}{chosenExtras.includes("Morango") && <span className="fruit fruit-strawberry" />}{chosenExtras.includes("Granola") && <span className="granola">••••••</span>}{(chosenExtras.includes("Leite condensado") || topping === "Leite condensado") && <span className="sauce sauce-light" />}{topping === "Chocolate" && <span className="sauce sauce-dark" />}{topping === "Morango" && <span className="sauce sauce-pink" />}</div>
      : kind === "milkshake" ? <div className={`shake-cup ${shakeSize === "300 ml" ? "shake-small" : shakeSize === "700 ml" ? "shake-large" : ""}`} style={{ "--shake-color": colors[topping] || (topping === "Ovomaltine" ? "#8c5b32" : topping === "Leite Ninho" ? "#f2e5c6" : "#d9b873") } as React.CSSProperties}><span className="shake-straw" /><span className="shake-liquid" /></div>
      : <div className={`ice-vessel ${format === "Casquinha" ? "is-cone" : ""}`}><span className="vessel-base" /><span className="scoops">{Array.from({ length: scoopCount }).map((_, i) => <i key={i} style={{ background: chosen[i] ? colors[chosen[i]] : "#ead3b1" }} />)}</span>{topping && topping !== "Sem cobertura" && <span className={`ice-drip ${topping === "Morango" ? "pink" : topping === "Leite condensado" ? "light" : ""}`} />}</div>}
  </div>;
}

function Promotions({ promotions, add }: { promotions: Promotion[]; add: (promo: Promotion) => void }) {
  return <section><Heading title="Promoções prontas" text="Escolha uma combinação e siga para os dados do pedido." /><div className="grid gap-4 md:grid-cols-2">{promotions.map((promo, index) => <article key={promo.id} className={`relative min-h-56 overflow-hidden rounded-[28px] bg-gradient-to-br p-6 text-white shadow-lg ${index % 2 ? "from-[#9d285b] to-[#51103b]" : "from-[#5b126f] to-[#2d073b]"}`}><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" /><span className="text-xs font-bold uppercase tracking-[.14em] text-[#ffd75c]">Escolha da Manu</span><h3 className="mt-5 text-2xl font-extrabold tracking-[-.04em]">{promo.title}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">{promo.description}</p><div className="mt-6 flex items-center justify-between"><strong className="text-xl">{formatCurrency(promo.price)}</strong><button onClick={() => add(promo)} className="min-h-11 rounded-full bg-[#f8b900] px-5 text-sm font-extrabold text-[#24002f]">Pedir agora</button></div></article>)}</div></section>;
}

function Checkout({ cart, setCart, customer, setCustomer, error, submit, addMore, deliveryFee, acceptedPayments, settings, canSubmit, availabilityMessage }: { cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; customer: Customer; setCustomer: React.Dispatch<React.SetStateAction<Customer>>; error: string; submit: () => void; addMore: () => void; deliveryFee: number; acceptedPayments: PaymentMethod[]; settings: StoreSettings; canSubmit: boolean; availabilityMessage: string }) {
  const [stage, setStage] = useState<CheckoutStage>("review");
  const [stageError, setStageError] = useState("");
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + deliveryFee;
  const stages: CheckoutStage[] = customer.deliveryType === "delivery"
    ? ["review", "delivery", "address", "name", "phone", "payment", "note", "confirm"]
    : ["review", "delivery", "name", "phone", "payment", "note", "confirm"];
  const stageIndex = Math.max(0, stages.indexOf(stage));
  const update = (patch: Partial<Customer>) => {
    setCustomer((current) => ({ ...current, ...patch }));
    setStageError("");
  };

  const next = () => {
    setStageError("");
    if (stage === "review") {
      if (!cart.length) return setStageError("Adicione pelo menos um item para continuar.");
      return setStage("delivery");
    }
    if (stage === "delivery") {
      if (!customer.deliveryType) return setStageError("Escolha uma das opções para continuar.");
      if (customer.deliveryType === "pickup" && !settings.status.allowPickup) return setStageError("A retirada não está disponível no momento.");
      if (customer.deliveryType === "delivery" && !settings.status.allowDelivery) return setStageError("A entrega não está disponível no momento.");
      return setStage(customer.deliveryType === "delivery" ? "address" : "name");
    }
    if (stage === "address") {
      if (!customer.address.trim()) return setStageError("Digite o endereço de entrega.");
      return setStage("name");
    }
    if (stage === "name") {
      if (!customer.name.trim()) return setStageError("Digite seu nome.");
      return setStage("phone");
    }
    if (stage === "phone") {
      if (!customer.phone.trim()) return setStageError("Digite seu WhatsApp.");
      if (!isValidPhone(customer.phone)) return setStageError("Digite um WhatsApp válido com DDD.");
      return setStage("payment");
    }
    if (stage === "payment") {
      if (!customer.payment) return setStageError("Escolha como você vai pagar.");
      if (!acceptedPayments.includes(customer.payment)) return setStageError("A forma de pagamento escolhida não está disponível.");
      return setStage("note");
    }
    if (stage === "note") return setStage("confirm");
    submit();
  };

  const back = () => {
    setStageError("");
    if (stage === "review") return addMore();
    const currentIndex = stages.indexOf(stage);
    setStage(stages[Math.max(0, currentIndex - 1)]);
  };

  const primaryLabel = stage === "confirm" ? "Enviar pedido" : "Continuar";

  return (
    <div className="mx-auto min-w-0 max-w-2xl pb-24 md:pb-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={back} className="inline-flex min-h-11 items-center gap-1 text-sm font-extrabold text-[#5f226b]"><ChevronLeft size={20} /> Voltar</button>
        <span className="text-xs font-bold text-[#7b6b7d]">Passo {stageIndex + 1} de {stages.length}</span>
      </div>
      <div className="mb-4 flex gap-1.5" aria-label={`Passo ${stageIndex + 1} de ${stages.length}`}>
        {stages.map((item, index) => <span key={item} className={`h-1.5 flex-1 rounded-full transition ${index <= stageIndex ? "bg-[#c83d76]" : "bg-[#e5d9e4]"}`} />)}
      </div>

      <section className="min-w-0 rounded-[24px] border border-[#eadfea] bg-white p-5 shadow-[0_18px_55px_rgba(50,8,65,.07)] md:p-8">
        {stage === "review" && (
          <div>
            <Question icon={<ShoppingBag />} title="Confira seu pedido" text="Veja se está tudo certo antes de continuar." />
            <CartReview cart={cart} setCart={setCart} editable />
            <button onClick={addMore} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[#6d2779]"><Plus size={17} /> Adicionar outro item</button>
            <div className="mt-4 flex items-center justify-between border-t border-[#eadfea] pt-4 text-lg"><strong>Total</strong><strong>{formatCurrency(total)}</strong></div>
          </div>
        )}

        {stage === "delivery" && (
          <div>
            <Question icon={<Truck />} title="Como você quer receber?" text="Escolha uma opção." />
            <div className={`grid gap-3 ${settings.status.allowPickup && settings.status.allowDelivery ? "grid-cols-2" : "grid-cols-1"}`}>
              {settings.status.allowPickup && <LargeOption active={customer.deliveryType === "pickup"} onClick={() => update({ deliveryType: "pickup" })} icon={<PackageCheck size={28} />} title="Retirar no local" />}
              {settings.status.allowDelivery && <LargeOption active={customer.deliveryType === "delivery"} onClick={() => update({ deliveryType: "delivery" })} icon={<Truck size={28} />} title="Receber em casa" />}
            </div>
            {!settings.status.allowPickup && !settings.status.allowDelivery && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Nenhuma forma de recebimento está disponível.</p>}
          </div>
        )}

        {stage === "address" && (
          <div>
            <Question icon={<MapPin />} title="Qual o endereço de entrega?" text="Digite rua, número e bairro." />
            <Field label="Endereço" value={customer.address} change={(value) => update({ address: value })} placeholder="Rua das Flores, 123 - Centro" />
            <p className="mt-2 text-xs text-[#817284]">Ex.: Rua das Flores, 123 - Centro</p>
          </div>
        )}

        {stage === "name" && (
          <div>
            <Question icon={<UserRound />} title="Qual seu nome?" text="Assim a equipe sabe para quem é o pedido." />
            <Field label="Nome" value={customer.name} change={(value) => update({ name: value })} placeholder="Digite seu nome" />
          </div>
        )}

        {stage === "phone" && (
          <div>
            <Question icon={<MessageCircle />} title="Qual seu WhatsApp?" text="Usamos para confirmar seu pedido, se precisar." />
            <Field label="WhatsApp" value={customer.phone} change={(value) => update({ phone: formatPhone(value) })} placeholder="(00) 00000-0000" type="tel" />
          </div>
        )}

        {stage === "payment" && (
          <div>
            <Question icon={<CreditCard />} title="Como você vai pagar?" text="Escolha uma forma de pagamento." />
            <div className="grid grid-cols-2 gap-3">
              {acceptedPayments.map((method) => <LargeOption key={method} active={customer.payment === method} onClick={() => update({ payment: method })} title={paymentLabels[method]} />)}
            </div>
            {!acceptedPayments.length && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Nenhuma forma de pagamento está disponível.</p>}
            {settings.payments.note && <p className="mt-3 text-xs leading-relaxed text-[#817284]">{settings.payments.note}</p>}
            {customer.payment === "Pix" && settings.payments.pixKey && <p className="mt-3 rounded-xl bg-[#f4eaf4] p-3 text-sm"><strong className="block text-[#4a0b63]">Chave Pix</strong>{settings.payments.pixKey}</p>}
          </div>
        )}

        {stage === "note" && (
          <div>
            <Question icon={<MessageCircle />} title="Quer deixar alguma observação?" text="Este campo é opcional." />
            <label className="grid gap-2 text-sm font-bold">Observação<textarea value={customer.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Ex.: sem colher, pouco leite condensado, troco para R$ 50" rows={4} className="rounded-2xl border border-[#dfd2df] p-4 font-normal outline-none focus:border-[#6d2779]" /></label>
            <button onClick={() => { update({ notes: "" }); setStage("confirm"); }} className="mt-3 min-h-11 text-sm font-extrabold text-[#6d2779]">Pular esta etapa</button>
          </div>
        )}

        {stage === "confirm" && (
          <div>
            <Question icon={<CheckCircle2 />} title="Conferir pedido" text="Confira os dados antes de enviar." />
            <CartReview cart={cart} setCart={setCart} />
            <div className="mt-4 grid gap-2 rounded-2xl bg-[#faf4f8] p-4 text-sm">
              <ReviewLine label="Recebimento" value={customer.deliveryType === "delivery" ? "Receber em casa" : "Retirar no local"} />
              {customer.deliveryType === "delivery" && <ReviewLine label="Endereço" value={customer.address} />}
              <ReviewLine label="Nome" value={customer.name} />
              <ReviewLine label="WhatsApp" value={customer.phone} />
              <ReviewLine label="Pagamento" value={customer.payment} />
              {customer.notes.trim() && <ReviewLine label="Observação" value={customer.notes} />}
            </div>
            {deliveryFee > 0 && <div className="mt-4 flex items-center justify-between border-t border-[#eadfea] pt-4 text-sm text-[#796b7b]"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>}
            {deliveryFee > 0 && <div className="mt-2 flex items-center justify-between text-sm text-[#796b7b]"><span>Taxa de entrega</span><strong>{formatCurrency(deliveryFee)}</strong></div>}
            <div className={`${deliveryFee > 0 ? "mt-2" : "mt-4 border-t border-[#eadfea] pt-4"} flex items-center justify-between text-lg`}><strong>Total</strong><strong>{formatCurrency(total)}</strong></div>
          </div>
        )}

        {!canSubmit && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{availabilityMessage}</p>}
        {(stageError || error) && <p role="alert" className="mt-4 rounded-xl bg-[#fff0f3] p-3 text-sm font-bold text-[#a52d54]">{stageError || error}</p>}
        <button onClick={next} disabled={stage === "confirm" && !canSubmit} className="mt-6 hidden min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#f8b900] px-5 font-extrabold text-[#24002f] shadow-sm disabled:cursor-not-allowed disabled:opacity-40 md:flex">{primaryLabel} <ArrowRight size={19} /></button>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#3a0a4d]/10 bg-[#fffaf4]/95 p-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-[84px]"><span className="block text-[10px] font-bold uppercase tracking-wider text-[#817284]">Total</span><strong className="text-base text-[#24002f]">{formatCurrency(total)}</strong></div>
          <button onClick={next} disabled={stage === "confirm" && !canSubmit} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f8b900] px-4 text-sm font-extrabold text-[#24002f] disabled:cursor-not-allowed disabled:opacity-40">{primaryLabel} <ArrowRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}

function Question({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="mb-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f1e4f1] text-[#6d2779]">{icon}</span><h2 className="mt-4 text-2xl font-extrabold tracking-[-.04em] text-[#24002f]">{title}</h2><p className="mt-2 text-sm leading-relaxed text-[#756878]">{text}</p></div>;
}

function UnavailableOption({ text }: { text: string }) {
  return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{text}</p>;
}

function LargeOption({ active, onClick, title, icon }: { active: boolean; onClick: () => void; title: string; icon?: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`relative flex min-h-28 min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border p-3 text-center text-sm font-extrabold transition active:scale-[.98] ${active ? "border-[#6d2779] bg-[#f4eaf4] text-[#4a0b63] shadow-[inset_0_0_0_1px_#6d2779]" : "border-[#dfd2df] bg-white text-[#655768]"}`}>{icon}{title}{active && <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-[#6d2779] text-white"><Check size={12} /></span>}</button>;
}

function CartReview({ cart, setCart, editable = false }: { cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; editable?: boolean }) {
  return <div className="grid gap-2">{cart.map((item) => <div key={item.id} className="rounded-2xl bg-[#faf4f8] p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-extrabold">{item.name}</h3><p className="mt-1 text-[11px] leading-relaxed text-[#796b7b]">{item.detail}</p></div>{editable && <button aria-label={`Remover ${item.name}`} onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))} className="shrink-0 text-[#a44b70]"><Trash2 size={16} /></button>}</div><div className="mt-2 flex items-center justify-between">{editable ? <div className="flex items-center gap-3"><button aria-label="Diminuir quantidade" onClick={() => setCart((current) => current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: Math.max(1, cartItem.quantity - 1) } : cartItem))} className="grid h-8 w-8 place-items-center rounded-lg bg-white"><Minus size={14} /></button><strong className="text-sm">{item.quantity}</strong><button aria-label="Aumentar quantidade" onClick={() => setCart((current) => current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem))} className="grid h-8 w-8 place-items-center rounded-lg bg-white"><Plus size={14} /></button></div> : <span className="text-xs font-bold text-[#796b7b]">{item.quantity}×</span>}<strong className="text-sm">{formatCurrency(item.price * item.quantity)}</strong></div></div>)}</div>;
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[90px_1fr] gap-3"><span className="text-[#817284]">{label}</span><strong className="min-w-0 break-words text-right">{value}</strong></div>;
}
function Field({ label, value, change, placeholder, type = "text" }: { label: string; value: string; change: SetText; placeholder: string; type?: string }) { const isPhone = type === "tel"; return <label className="grid min-w-0 gap-1.5 text-xs font-bold md:gap-2 md:text-sm">{label}<input type={type} inputMode={isPhone ? "numeric" : undefined} autoComplete={isPhone ? "tel" : undefined} maxLength={isPhone ? 15 : undefined} value={value} onChange={e => change(e.target.value)} placeholder={placeholder} className="min-h-11 min-w-0 rounded-xl border border-[#dfd2df] px-3 text-sm font-normal outline-none focus:border-[#6d2779] md:min-h-13 md:px-4" /></label>; }
function Success({ id, restart }: { id: string; restart: () => void }) {
  const code = createPublicOrderCode(id);
  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_20%,#5b126f,#24002f_62%)] px-5 py-10 text-white"><div className="w-full max-w-lg text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#f8b900] text-[#24002f] shadow-[0_0_0_12px_rgba(248,185,0,.1)]"><Check size={36} strokeWidth={3} /></span><p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[#f8b900]">Tudo certo</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.05em]">Pedido enviado</h1><p className="mx-auto mt-4 max-w-sm leading-relaxed text-white/70">Seu pedido chegou para a equipe da Manu.</p><div className="mx-auto mt-7 max-w-xs rounded-2xl border border-white/10 bg-white/10 p-4"><span className="text-xs text-white/60">Código do pedido</span><strong className="mt-1 block text-2xl tracking-[.08em]">#{code}</strong></div><div className="mx-auto mt-7 grid max-w-sm gap-2"><Link href={`/acompanhar/${id}`} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f8b900] px-7 font-extrabold text-[#24002f]">Acompanhar pedido <ArrowRight size={18} /></Link><button onClick={restart} className="min-h-12 rounded-full border border-white/15 bg-white/10 px-7 font-bold text-white">Fazer outro pedido</button></div><Link href="/" className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-white/70"><ArrowLeft size={17} /> Voltar ao início</Link></div></main>;
}
