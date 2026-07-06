"use client";

import { useMemo, useState } from "react";
import {
  BadgePercent,
  Check,
  ChevronRight,
  CreditCard,
  IceCreamBowl,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useStore } from "@/components/store-provider";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { PaymentMethod, PaymentStatus, Product } from "@/lib/types";
import { formatCurrency, uid } from "@/lib/utils";
import { formatPhone, isValidPhone } from "@/lib/phone";

type Kind = "acai" | "icecream" | "milkshake" | "promo" | "product";
type Phase = "build" | "checkout";
type CartItem = {
  id: string;
  productId: string;
  name: string;
  detail: string;
  price: number;
  quantity: number;
};

const acaiSizes = [
  { name: "300 ml", price: 14 },
  { name: "500 ml", price: 19 },
  { name: "700 ml", price: 25 },
  { name: "1 litro", price: 34 },
];
const FREE_ACAI_EXTRAS = 3;
const acaiExtras = [
  { name: "Leite condensado", price: 2 },
  { name: "Leite em pó", price: 2 },
  { name: "Granola", price: 2 },
  { name: "Banana", price: 2 },
  { name: "Morango", price: 3 },
  { name: "Paçoca", price: 2 },
  { name: "Amendoim", price: 2 },
  { name: "Nutella", price: 3 },
];
const iceFormats = [
  { name: "Copo", price: 0 },
  { name: "Casquinha", price: 0 },
  { name: "Pote", price: 4 },
];
const iceScoops = [
  { name: "1 bola", price: 7, max: 1 },
  { name: "2 bolas", price: 12, max: 2 },
  { name: "3 bolas", price: 16, max: 3 },
];
const iceFlavors = ["Chocolate", "Morango", "Creme", "Flocos", "Napolitano", "Açaí"];
const shakeSizes = [
  { name: "300 ml", price: 12 },
  { name: "500 ml", price: 17 },
  { name: "700 ml", price: 22 },
];
const shakeFlavors = ["Chocolate", "Morango", "Ovomaltine", "Leite Ninho", "Açaí", "Creme"];

const categoryOptions: { kind: Kind; title: string; description: string; icon: typeof Sparkles; tone: string }[] = [
  { kind: "acai", title: "Açaí", description: "Tamanho e adicionais", icon: Sparkles, tone: "bg-[#4a0b63] text-white" },
  { kind: "icecream", title: "Sorvete", description: "Tipo, bolas e sabores", icon: IceCreamBowl, tone: "bg-[#c83d76] text-white" },
  { kind: "milkshake", title: "Milk-shake", description: "Tamanho e sabor", icon: ShoppingCart, tone: "bg-[#8b573e] text-white" },
  { kind: "promo", title: "Promoções", description: "Adicionar direto", icon: BadgePercent, tone: "bg-[#e6a900] text-[#24002f]" },
  { kind: "product", title: "Produto avulso", description: "Catálogo completo", icon: PackagePlus, tone: "bg-slate-700 text-white" },
];

export default function NewOrderPage() {
  const { products, addOrder } = useStore();
  const [phase, setPhase] = useState<Phase>("build");
  const [kind, setKind] = useState<Kind | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState("");

  const [acaiSize, setAcaiSize] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [acaiNote, setAcaiNote] = useState("");
  const [iceFormat, setIceFormat] = useState("");
  const [iceScoop, setIceScoop] = useState("");
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [iceNote, setIceNote] = useState("");
  const [shakeSize, setShakeSize] = useState("");
  const [shakeFlavor, setShakeFlavor] = useState("");
  const [shakeNote, setShakeNote] = useState("");
  const [search, setSearch] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const paidExtras = selectedExtras.slice(FREE_ACAI_EXTRAS);
  const acaiPrice = (acaiSizes.find((item) => item.name === acaiSize)?.price || 0)
    + paidExtras.reduce((sum, name) => sum + (acaiExtras.find((item) => item.name === name)?.price || 0), 0);
  const icePrice = (iceScoops.find((item) => item.name === iceScoop)?.price || 0)
    + (iceFormats.find((item) => item.name === iceFormat)?.price || 0);
  const shakePrice = shakeSizes.find((item) => item.name === shakeSize)?.price || 0;
  const promotions = products.filter((product) => product.active && product.availableToday && product.category === "Promoções");
  const availableProducts = products.filter((product) =>
    product.active && product.availableToday && `${product.name} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()),
  ).sort((a, b) => a.displayOrder - b.displayOrder);

  function resetBuilder() {
    setAcaiSize("");
    setSelectedExtras([]);
    setAcaiNote("");
    setIceFormat("");
    setIceScoop("");
    setSelectedFlavors([]);
    setIceNote("");
    setShakeSize("");
    setShakeFlavor("");
    setShakeNote("");
  }

  function chooseKind(nextKind: Kind) {
    if (nextKind !== kind) resetBuilder();
    setMessage("");
    setKind(nextKind);
    setPhase("build");
  }

  function addCartItem(item: Omit<CartItem, "id" | "quantity">) {
    setCart((current) => [...current, { ...item, id: uid(), quantity: 1 }]);
    setMessage(`${item.name} adicionado ao pedido.`);
  }

  function addAcai() {
    if (!acaiSize) return setMessage("Escolha o tamanho do açaí.");
    const included = selectedExtras.slice(0, FREE_ACAI_EXTRAS);
    const details = [
      included.length ? `Inclusos: ${included.join(", ")}` : "Sem adicionais",
      paidExtras.length ? `Pagos: ${paidExtras.join(", ")}` : "",
      acaiNote.trim() ? `Observação: ${acaiNote.trim()}` : "",
    ].filter(Boolean);
    addCartItem({ productId: "internal-acai", name: `Açaí ${acaiSize}`, detail: details.join(" · "), price: acaiPrice });
    resetBuilder();
  }

  function addIceCream() {
    if (!iceFormat) return setMessage("Escolha como servir o sorvete.");
    if (!iceScoop) return setMessage("Escolha a quantidade de bolas.");
    if (!selectedFlavors.length) return setMessage("Escolha pelo menos um sabor.");
    const details = [
      selectedFlavors.join(", "),
      iceNote.trim() ? `Observação: ${iceNote.trim()}` : "",
    ].filter(Boolean);
    addCartItem({ productId: "internal-icecream", name: `Sorvete no ${iceFormat.toLowerCase()} · ${iceScoop}`, detail: details.join(" · "), price: icePrice });
    resetBuilder();
  }

  function addMilkshake() {
    if (!shakeSize) return setMessage("Escolha o tamanho do milk-shake.");
    if (!shakeFlavor) return setMessage("Escolha o sabor do milk-shake.");
    addCartItem({
      productId: "internal-milkshake",
      name: `Milk-shake ${shakeSize} · ${shakeFlavor}`,
      detail: shakeNote.trim() ? `Observação: ${shakeNote.trim()}` : "Sem observações",
      price: shakePrice,
    });
    resetBuilder();
  }

  function toggleFlavor(name: string) {
    const max = iceScoops.find((item) => item.name === iceScoop)?.max || 1;
    setSelectedFlavors((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : current.length < max ? [...current, name] : [...current.slice(1), name],
    );
  }

  function updateQuantity(id: string, amount: number) {
    setCart((current) => current.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item,
    ));
  }

  function saveOrder() {
    if (!cart.length) {
      setMessage("Adicione pelo menos um item ao pedido.");
      setPhase("build");
      return;
    }
    if (phone.trim() && !isValidPhone(phone)) {
      setValidationError("Informe um telefone válido com DDD.");
      return;
    }
    const id = addOrder({
      customerName: customerName.trim() || "Cliente balcão",
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      paymentMethod,
      paymentStatus,
      orderStatus: "new",
      status: paymentStatus === "paid" ? "paid" : "pending_payment",
      origin: "internal",
      deliveryType: "pickup",
      total,
      items: cart.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.detail ? `${item.name} — ${item.detail}` : item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    });
    setOrderId(id);
  }

  function startAgain() {
    setOrderId("");
    setPhase("build");
    setKind(null);
    setCart([]);
    setCustomerName("");
    setPhone("");
    setNotes("");
    setPaymentMethod("Pix");
    setPaymentStatus("paid");
    setMessage("");
    setValidationError("");
    resetBuilder();
  }

  function goToCheckout() {
    setValidationError("");
    setPhase("checkout");
  }

  if (orderId) return <Success orderId={orderId} startAgain={startAgain} />;

  return (
    <>
    <div className="relative min-w-0 pb-24 lg:pb-0">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#8b4d97]">Caixa rápido</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-[-.04em]">Novo pedido de balcão</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Monte os itens e finalize o pagamento.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold sm:flex">
          <Step active={phase === "build"} number="1" label="Montar" />
          <Step active={phase === "checkout"} number="2" label="Finalizar" />
        </div>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="grid min-w-0 content-start gap-5">
          {phase === "build" ? (
            <>
              <Card className="p-4 md:p-5">
                <div className="mb-3"><h3 className="font-extrabold">O que vai entrar no pedido?</h3><p className="text-xs text-[var(--muted)]">Escolha uma categoria para começar.</p></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                  {categoryOptions.map(({ kind: optionKind, title, description, icon: Icon, tone }) => (
                    <button key={optionKind} type="button" onClick={() => chooseKind(optionKind)} className={`min-w-0 rounded-xl border p-3 text-left transition active:scale-[.98] ${kind === optionKind ? "border-[#6d2779] bg-[#f5ecf6] shadow-[inset_0_0_0_1px_#6d2779]" : "border-[var(--border)] bg-white hover:border-[#ceb6d2]"}`}>
                      <span className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}><Icon size={18} /></span>
                      <strong className="mt-3 block text-sm">{title}</strong>
                      <span className="mt-0.5 block text-[10px] leading-tight text-[var(--muted)]">{description}</span>
                    </button>
                  ))}
                </div>
              </Card>

              {!kind && (
                <Card className="border-dashed py-10 text-center">
                  <ShoppingCart className="mx-auto text-[#b895bf]" size={30} />
                  <p className="mt-3 font-extrabold">Escolha uma categoria</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">O montador aparecerá aqui.</p>
                </Card>
              )}
              {kind === "acai" && (
                <AcaiBuilder
                  size={acaiSize}
                  setSize={setAcaiSize}
                  selectedExtras={selectedExtras}
                  toggleExtra={(name) => setSelectedExtras((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])}
                  note={acaiNote}
                  setNote={setAcaiNote}
                  price={acaiPrice}
                  add={addAcai}
                />
              )}
              {kind === "icecream" && (
                <IceCreamBuilder
                  format={iceFormat}
                  setFormat={setIceFormat}
                  scoop={iceScoop}
                  setScoop={(value) => { setIceScoop(value); setSelectedFlavors([]); }}
                  selectedFlavors={selectedFlavors}
                  toggleFlavor={toggleFlavor}
                  note={iceNote}
                  setNote={setIceNote}
                  price={icePrice}
                  add={addIceCream}
                />
              )}
              {kind === "milkshake" && (
                <MilkshakeBuilder
                  size={shakeSize}
                  setSize={setShakeSize}
                  flavor={shakeFlavor}
                  setFlavor={setShakeFlavor}
                  note={shakeNote}
                  setNote={setShakeNote}
                  price={shakePrice}
                  add={addMilkshake}
                />
              )}
              {kind === "promo" && <Promotions products={promotions} add={addCartItem} />}
              {kind === "product" && <ProductCatalog products={availableProducts} search={search} setSearch={setSearch} add={addCartItem} />}
              {message && <p role="status" className="rounded-xl bg-[#f3eaf5] px-4 py-3 text-sm font-bold text-[#6d2779]">{message}</p>}
              <div className="lg:hidden"><CartCard cart={cart} total={total} updateQuantity={updateQuantity} remove={(id) => setCart((current) => current.filter((item) => item.id !== id))} /></div>
            </>
          ) : (
            <Checkout
              customerName={customerName}
              setCustomerName={setCustomerName}
              phone={phone}
              setPhone={(value) => { setPhone(value); setValidationError(""); }}
              notes={notes}
              setNotes={setNotes}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              paymentStatus={paymentStatus}
              setPaymentStatus={setPaymentStatus}
              cart={cart}
              total={total}
              updateQuantity={updateQuantity}
              remove={(id) => setCart((current) => current.filter((item) => item.id !== id))}
              addMore={() => { setValidationError(""); setPhase("build"); }}
              error={validationError}
            />
          )}
        </main>

        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-24 grid gap-3">
            <CartCard cart={cart} total={total} updateQuantity={updateQuantity} remove={(id) => setCart((current) => current.filter((item) => item.id !== id))} />
            <Button disabled={!cart.length} onClick={() => phase === "build" ? goToCheckout() : saveOrder()} className="min-h-14 w-full text-base">
              {phase === "build" ? <>Finalizar pedido <ChevronRight size={19} /></> : <><Check size={19} /> Salvar pedido</>}
            </Button>
            {phase === "checkout" && <Button variant="ghost" onClick={() => setPhase("build")}>Adicionar outro item</Button>}
          </div>
        </aside>
      </div>

    </div>

      <div className="fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#21062f]/95 p-2.5 pl-4 text-white shadow-[0_14px_35px_rgba(33,6,47,.24)] backdrop-blur-xl">
          <div className="min-w-0 flex-1"><span className="block text-[9px] font-bold uppercase tracking-wider text-purple-200/65">{cart.length} {cart.length === 1 ? "item" : "itens"}</span><strong className="block truncate text-base">{formatCurrency(total)}</strong></div>
          <button disabled={!cart.length} onClick={() => phase === "build" ? goToCheckout() : saveOrder()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--yellow)] px-4 text-sm font-extrabold text-[var(--purple-dark)] disabled:opacity-40">
            {phase === "build" ? <>Finalizar <ChevronRight size={18} /></> : <><Check size={18} /> Salvar</>}
          </button>
        </div>
      </div>
    </>
  );
}

function Step({ active, number, label }: { active: boolean; number: string; label: string }) {
  return <span className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border px-3 ${active ? "border-[var(--purple)] bg-[var(--purple)] text-white" : "border-[var(--border)] bg-white text-slate-500"}`}><i className={`grid h-5 w-5 place-items-center rounded-full not-italic ${active ? "bg-white/15" : "bg-slate-100"}`}>{number}</i>{label}</span>;
}

function BuilderHeader({ title, description, price }: { title: string; description: string; price: number }) {
  return <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold">{title}</h3><p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p></div><strong className="shrink-0 text-lg text-[var(--purple)]">{price ? formatCurrency(price) : "—"}</strong></div>;
}

function OptionButton({ label, detail, active, onClick }: { label: string; detail?: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`relative min-h-14 min-w-0 rounded-xl border p-3 text-left transition active:scale-[.98] ${active ? "border-[#6d2779] bg-[#f4eaf4] shadow-[inset_0_0_0_1px_#6d2779]" : "border-[var(--border)] bg-white"}`}><span className="block text-xs font-extrabold">{label}</span>{detail && <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{detail}</span>}{active && <Check className="absolute right-2 top-2 text-[#6d2779]" size={14} />}</button>;
}

function AcaiBuilder({ size, setSize, selectedExtras, toggleExtra, note, setNote, price, add }: { size: string; setSize: (value: string) => void; selectedExtras: string[]; toggleExtra: (value: string) => void; note: string; setNote: (value: string) => void; price: number; add: () => void }) {
  const paidCount = Math.max(0, selectedExtras.length - FREE_ACAI_EXTRAS);
  return <Card className="grid gap-5 p-4 md:p-5"><BuilderHeader title="Montar açaí" description="Tamanho, adicionais e pronto." price={price} /><section><h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">1. Tamanho</h4><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{acaiSizes.map((item) => <OptionButton key={item.name} label={item.name} detail={formatCurrency(item.price)} active={size === item.name} onClick={() => setSize(item.name)} />)}</div></section><section><div className="mb-2 flex items-center justify-between gap-2"><h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">2. Adicionais</h4><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${paidCount ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{Math.min(selectedExtras.length, 3)}/3 grátis{paidCount ? ` · ${paidCount} pago${paidCount > 1 ? "s" : ""}` : ""}</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{acaiExtras.map((item) => { const index = selectedExtras.indexOf(item.name); const detail = index >= FREE_ACAI_EXTRAS ? `+ ${formatCurrency(item.price)}` : index >= 0 ? "Grátis" : selectedExtras.length >= FREE_ACAI_EXTRAS ? `+ ${formatCurrency(item.price)}` : "Incluso"; return <OptionButton key={item.name} label={item.name} detail={detail} active={index >= 0} onClick={() => toggleExtra(item.name)} />; })}</div></section><Field label="Observação do item (opcional)"><Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Ex.: pouco leite condensado" /></Field><Button onClick={add} className="min-h-13 w-full"><Plus size={18} /> Adicionar açaí</Button></Card>;
}

function IceCreamBuilder({ format, setFormat, scoop, setScoop, selectedFlavors, toggleFlavor, note, setNote, price, add }: { format: string; setFormat: (value: string) => void; scoop: string; setScoop: (value: string) => void; selectedFlavors: string[]; toggleFlavor: (value: string) => void; note: string; setNote: (value: string) => void; price: number; add: () => void }) {
  const maxFlavors = iceScoops.find((item) => item.name === scoop)?.max || 1;
  return <Card className="grid gap-5 p-4 md:p-5"><BuilderHeader title="Montar sorvete" description="Escolha como servir, as bolas e os sabores." price={price} /><section><h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">1. Tipo</h4><div className="grid grid-cols-3 gap-2">{iceFormats.map((item) => <OptionButton key={item.name} label={item.name} detail={item.price ? `+ ${formatCurrency(item.price)}` : "Incluso"} active={format === item.name} onClick={() => setFormat(item.name)} />)}</div></section><section><h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">2. Quantidade</h4><div className="grid grid-cols-3 gap-2">{iceScoops.map((item) => <OptionButton key={item.name} label={item.name} detail={formatCurrency(item.price)} active={scoop === item.name} onClick={() => setScoop(item.name)} />)}</div></section><section><div className="mb-2 flex justify-between gap-2"><h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">3. Sabores</h4><span className="text-[10px] font-bold text-[var(--muted)]">Até {maxFlavors}</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{iceFlavors.map((flavor) => <OptionButton key={flavor} label={flavor} active={selectedFlavors.includes(flavor)} onClick={() => toggleFlavor(flavor)} />)}</div></section><Field label="Observação do item (opcional)"><Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Ex.: sabores separados" /></Field><Button onClick={add} className="min-h-13 w-full"><Plus size={18} /> Adicionar sorvete</Button></Card>;
}

function MilkshakeBuilder({ size, setSize, flavor, setFlavor, note, setNote, price, add }: { size: string; setSize: (value: string) => void; flavor: string; setFlavor: (value: string) => void; note: string; setNote: (value: string) => void; price: number; add: () => void }) {
  return <Card className="grid gap-5 p-4 md:p-5"><BuilderHeader title="Montar milk-shake" description="Só tamanho e sabor." price={price} /><section><h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">1. Tamanho</h4><div className="grid grid-cols-3 gap-2">{shakeSizes.map((item) => <OptionButton key={item.name} label={item.name} detail={formatCurrency(item.price)} active={size === item.name} onClick={() => setSize(item.name)} />)}</div></section><section><h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">2. Sabor</h4><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{shakeFlavors.map((item) => <OptionButton key={item} label={item} active={flavor === item} onClick={() => setFlavor(item)} />)}</div></section><Field label="Observação do item (opcional)"><Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Ex.: sem canudo" /></Field><Button onClick={add} className="min-h-13 w-full"><Plus size={18} /> Adicionar milk-shake</Button></Card>;
}

function Promotions({ products, add }: { products: Product[]; add: (item: Omit<CartItem, "id" | "quantity">) => void }) {
  return <Card className="p-4 md:p-5"><BuilderHeader title="Promoções ativas" description="Adicione uma combinação pronta." price={0} />{products.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{products.map((product) => <article key={product.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[#fffaf3] p-3"><div className="min-w-0"><strong className="block truncate text-sm">{product.name}</strong><span className="text-xs font-bold text-[var(--purple)]">{formatCurrency(product.price)}</span></div><button onClick={() => add({ productId: product.id, name: product.name, detail: "Promoção cadastrada", price: product.price })} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--yellow)] text-[var(--purple-dark)]" aria-label={`Adicionar ${product.name}`}><Plus size={18} /></button></article>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhuma promoção ativa cadastrada.</p>}</Card>;
}

function ProductCatalog({ products, search, setSearch, add }: { products: Product[]; search: string; setSearch: (value: string) => void; add: (item: Omit<CartItem, "id" | "quantity">) => void }) {
  return <Card className="p-4 md:p-5"><BuilderHeader title="Produto avulso" description="Busque qualquer produto cadastrado." price={0} /><div className="relative mt-4"><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" placeholder="Buscar produto ou categoria" /></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{products.map((product) => <article key={product.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3"><div className="min-w-0"><strong className="block truncate text-sm">{product.name}</strong><span className="text-[10px] text-[var(--muted)]">{product.category}</span><span className="ml-2 text-xs font-bold text-[var(--purple)]">{formatCurrency(product.price)}</span></div><button onClick={() => add({ productId: product.id, name: product.name, detail: "Produto avulso", price: product.price })} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f2e9f4] text-[var(--purple)]" aria-label={`Adicionar ${product.name}`}><Plus size={18} /></button></article>)}</div>{!products.length && <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhum produto encontrado.</p>}</Card>;
}

function CartCard({ cart, total, updateQuantity, remove }: { cart: CartItem[]; total: number; updateQuantity: (id: string, amount: number) => void; remove: (id: string) => void }) {
  return <Card className="min-w-0 p-4"><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-extrabold"><ShoppingCart size={18} /> Pedido atual</h3><span className="text-xs font-bold text-[var(--muted)]">{cart.length} {cart.length === 1 ? "item" : "itens"}</span></div>{cart.length ? <div className="mt-3 grid gap-2">{cart.map((item) => <div key={item.id} className="min-w-0 rounded-xl bg-[#faf5f9] p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><strong className="block truncate text-sm">{item.name}</strong><p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--muted)]">{item.detail}</p></div><button onClick={() => remove(item.id)} aria-label={`Remover ${item.name}`} className="shrink-0 text-[#a44b70]"><Trash2 size={16} /></button></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={() => updateQuantity(item.id, -1)} aria-label="Diminuir quantidade" className="grid h-8 w-8 place-items-center rounded-lg bg-white"><Minus size={14} /></button><strong className="text-sm">{item.quantity}</strong><button onClick={() => updateQuantity(item.id, 1)} aria-label="Aumentar quantidade" className="grid h-8 w-8 place-items-center rounded-lg bg-white"><Plus size={14} /></button></div><strong className="text-sm">{formatCurrency(item.price * item.quantity)}</strong></div></div>)}</div> : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Nenhum item adicionado.</p>}<div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4"><span className="font-bold">Total</span><strong className="text-xl text-[var(--purple)]">{formatCurrency(total)}</strong></div></Card>;
}

function Checkout({ customerName, setCustomerName, phone, setPhone, notes, setNotes, paymentMethod, setPaymentMethod, paymentStatus, setPaymentStatus, cart, total, updateQuantity, remove, addMore, error }: { customerName: string; setCustomerName: (value: string) => void; phone: string; setPhone: (value: string) => void; notes: string; setNotes: (value: string) => void; paymentMethod: PaymentMethod; setPaymentMethod: (value: PaymentMethod) => void; paymentStatus: PaymentStatus; setPaymentStatus: (value: PaymentStatus) => void; cart: CartItem[]; total: number; updateQuantity: (id: string, amount: number) => void; remove: (id: string) => void; addMore: () => void; error: string }) {
  return <div className="grid gap-5"><div className="lg:hidden"><CartCard cart={cart} total={total} updateQuantity={updateQuantity} remove={remove} /><Button variant="ghost" onClick={addMore} className="mt-2 w-full"><Plus size={17} /> Adicionar outro item</Button></div><Card className="grid gap-5 p-4 md:p-5"><div><h3 className="flex items-center gap-2 text-lg font-extrabold"><UserRound size={19} /> Cliente</h3><p className="mt-1 text-xs text-[var(--muted)]">Se deixar vazio, salvaremos como Cliente balcão.</p></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Nome do cliente"><Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Cliente balcão" /></Field><Field label="Telefone (opcional)"><Input type="tel" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} inputMode="numeric" autoComplete="tel" maxLength={15} placeholder="(00) 00000-0000" /></Field></div>{error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700">{error}</p>}<div className="rounded-xl bg-[#f5ecf6] p-3 text-xs font-bold text-[#6d2779]">Origem: balcão · Tipo: retirada</div></Card><Card className="grid gap-5 p-4 md:p-5"><div><h3 className="flex items-center gap-2 text-lg font-extrabold"><CreditCard size={19} /> Pagamento</h3><p className="mt-1 text-xs text-[var(--muted)]">Informe como o cliente vai pagar.</p></div><Field label="Forma de pagamento"><Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option value="Fiado/Outro">A combinar</option></Select></Field><div><p className="mb-2 text-sm font-bold text-slate-700">Status do pagamento</p><div className="grid grid-cols-2 gap-2"><button onClick={() => setPaymentStatus("paid")} className={`min-h-12 rounded-xl border text-sm font-bold ${paymentStatus === "paid" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-[var(--border)] bg-white text-slate-600"}`}>Pago</button><button onClick={() => setPaymentStatus("pending")} className={`min-h-12 rounded-xl border text-sm font-bold ${paymentStatus === "pending" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-[var(--border)] bg-white text-slate-600"}`}>Pendente</button></div></div><Field label="Observações gerais (opcional)"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Ex.: troco para R$ 50, retirar mais tarde" /></Field></Card></div>;
}

function Success({ orderId, startAgain }: { orderId: string; startAgain: () => void }) {
  return <Card className="mx-auto max-w-xl overflow-hidden p-0 text-center"><div className="bg-[linear-gradient(135deg,#310740,#5b126f)] px-5 py-9 text-white"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--yellow)] text-[var(--purple-dark)] shadow-[0_0_0_10px_rgba(248,185,0,.12)]"><Check size={30} strokeWidth={3} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.14em] text-[#f8d34f]">Pedido salvo</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Tudo certo no balcão</h2><p className="mt-2 text-sm text-purple-100/70">Pedido #{orderId.slice(0, 8).toUpperCase()} criado e enviado para a fila de preparo.</p></div><div className="grid gap-2 p-5 sm:grid-cols-2"><Link href={`/pedidos/${orderId}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--yellow)] px-4 text-sm font-extrabold text-[var(--purple-dark)]">Ver pedido</Link><Button variant="secondary" onClick={startAgain}>Novo pedido</Button><Link href={`/pedidos/${orderId}/imprimir`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--purple)] sm:col-span-2"><Printer size={15} /> Imprimir via do cliente</Link></div></Card>;
}
