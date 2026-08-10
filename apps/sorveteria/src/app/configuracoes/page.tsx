"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  BadgePercent,
  Clock3,
  CreditCard,
  IceCreamBowl,
  MapPin,
  Package,
  Plus,
  Save,
  Settings2,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import { useStore } from "@/components/store-provider";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { ConfigurableItem, PaymentMethod, Promotion, StoreSettings, WeekdayKey } from "@/lib/types";
import { paymentLabels, weekdayLabels, weekdayOrder } from "@/lib/settings";
import { uid } from "@/lib/utils";

type ItemListKey = "acaiExtras" | "iceCreamFlavors" | "milkshakeFlavors";

export default function SettingsPage() {
  const { products, settings, settingsSaveError, settingsSaving, dataError, updateSettings } = useStore();

  const update = (recipe: (current: StoreSettings) => StoreSettings) => {
    updateSettings(recipe);
  };
  const setStatus = <K extends keyof StoreSettings["status"]>(key: K, value: StoreSettings["status"][K]) =>
    update((current) => ({ ...current, status: { ...current.status, [key]: value } }));
  const setDelivery = <K extends keyof StoreSettings["delivery"]>(key: K, value: StoreSettings["delivery"][K]) =>
    update((current) => ({ ...current, delivery: { ...current.delivery, [key]: value } }));
  const setSite = <K extends keyof StoreSettings["site"]>(key: K, value: StoreSettings["site"][K]) =>
    update((current) => ({ ...current, site: { ...current.site, [key]: value } }));

  function setHour(day: WeekdayKey, patch: Partial<StoreSettings["businessHours"][WeekdayKey]>) {
    update((current) => ({
      ...current,
      businessHours: {
        ...current.businessHours,
        [day]: { ...current.businessHours[day], ...patch },
      },
    }));
  }

  function addPromotion() {
    const promotion: Promotion = {
      id: uid(),
      title: "Nova promoção",
      description: "",
      price: 0,
      active: true,
      featuredOnHome: false,
    };
    update((current) => ({ ...current, promotions: [...current.promotions, promotion] }));
  }

  function updatePromotion(id: string, patch: Partial<Promotion>) {
    update((current) => ({
      ...current,
      promotions: current.promotions.map((promotion) => promotion.id === id
        ? { ...promotion, ...patch }
        : patch.featuredOnHome ? { ...promotion, featuredOnHome: false } : promotion),
    }));
  }

  function removePromotion(id: string) {
    if (!confirm("Deseja excluir esta promoção?")) return;
    update((current) => ({ ...current, promotions: current.promotions.filter((promotion) => promotion.id !== id) }));
  }

  function addItem(key: ItemListKey) {
    const item: ConfigurableItem = {
      id: uid(),
      name: key === "acaiExtras" ? "Novo adicional" : "Novo sabor",
      available: true,
      ...(key === "acaiExtras" ? { extraPrice: 0 } : { previewColor: "#8b5a75" }),
    };
    update((current) => ({ ...current, [key]: [...current[key], item] }));
  }

  function updateItem(key: ItemListKey, id: string, patch: Partial<ConfigurableItem>) {
    update((current) => ({
      ...current,
      [key]: current[key].map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  function removeItem(key: ItemListKey, id: string) {
    update((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }));
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-extrabold tracking-[-.04em] text-[var(--text)]">Configurações da loja</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">Gerencie a operação, o delivery e o conteúdo do site. As alterações são salvas no Supabase.</p>
        </div>
        <span role="status" className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${settingsSaveError ? "bg-red-50 text-red-700" : settingsSaving ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}><Save size={15} /> {settingsSaveError ? "Não foi possível salvar" : settingsSaving ? "Salvando..." : "Alterações salvas"}</span>
      </div>
      {dataError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{dataError}</p>}

      <Section icon={<Store />} title="Status da loja" description="Controle rapidamente quando os pedidos online podem entrar." open>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Delivery aberto" description="Libera o funcionamento conforme os horários cadastrados." checked={settings.status.deliveryOpen} onChange={(value) => setStatus("deliveryOpen", value)} />
          <Toggle label="Pausar pedidos online" description="Use como chave geral para interromper novos pedidos." checked={settings.status.pauseOnlineOrders} onChange={(value) => setStatus("pauseOnlineOrders", value)} />
          <Toggle label="Permitir retirada" checked={settings.status.allowPickup} onChange={(value) => setStatus("allowPickup", value)} />
          <Toggle label="Permitir entrega" checked={settings.status.allowDelivery} onChange={(value) => setStatus("allowDelivery", value)} />
          <Toggle label="Fechado hoje" description="Indisponibiliza os pedidos durante todo o dia, até você desmarcar." checked={settings.status.closedToday} onChange={(value) => setStatus("closedToday", value)} />
          <Toggle label="Pausa temporária" description="Use por alguns minutos em períodos de alta demanda ou imprevistos." checked={settings.status.temporaryPause} onChange={(value) => setStatus("temporaryPause", value)} />
        </div>
        <Field label="Mensagem exibida quando fechado">
          <Textarea value={settings.status.closedMessage} onChange={(event) => setStatus("closedMessage", event.target.value)} rows={3} placeholder="Informe quando os pedidos voltarão." />
        </Field>
      </Section>

      <Section icon={<Clock3 />} title="Horários de atendimento" description="Defina os horários usados para liberar pedidos em cada dia.">
        <div className="grid gap-2">
          {weekdayOrder.map((day) => {
            const hours = settings.businessHours[day];
            return (
              <div key={day} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[#fffdfa] p-3 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-center">
                <Toggle compact label={weekdayLabels[day]} description={hours.enabled ? "Aberto" : "Fechado"} checked={hours.enabled} onChange={(value) => setHour(day, { enabled: value })} />
                <Field label="Abertura"><Input aria-label={`Abertura de ${weekdayLabels[day]}`} type="time" disabled={!hours.enabled} value={hours.open} onChange={(event) => setHour(day, { open: event.target.value })} /></Field>
                <Field label="Fechamento"><Input aria-label={`Fechamento de ${weekdayLabels[day]}`} type="time" disabled={!hours.enabled} value={hours.close} onChange={(event) => setHour(day, { close: event.target.value })} /></Field>
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={<Truck />} title="Entrega" description="Defina o valor acrescentado aos pedidos entregues.">
        <div className="max-w-sm">
          <Field label="Taxa de entrega"><Input type="number" inputMode="decimal" min="0" step="0.01" value={settings.delivery.fee} onChange={(event) => setDelivery("fee", Math.max(0, Number(event.target.value) || 0))} /></Field>
        </div>
        <p className="text-xs text-[var(--muted)]">Este valor é acrescentado ao total quando o cliente escolhe receber em casa.</p>
      </Section>

      <Section icon={<CreditCard />} title="Pagamentos" description="Somente as formas ativas aparecem no checkout do delivery.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(paymentLabels) as PaymentMethod[]).map((method) => (
            <Toggle
              key={method}
              label={paymentLabels[method]}
              checked={settings.payments.accepted[method]}
              onChange={(value) => update((current) => ({
                ...current,
                payments: { ...current.payments, accepted: { ...current.payments.accepted, [method]: value } },
              }))}
            />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Chave Pix (opcional)"><Input value={settings.payments.pixKey} onChange={(event) => update((current) => ({ ...current, payments: { ...current.payments, pixKey: event.target.value } }))} placeholder="CPF, telefone, e-mail ou chave aleatória" /></Field>
          <Field label="Observação sobre pagamento"><Textarea value={settings.payments.note} onChange={(event) => update((current) => ({ ...current, payments: { ...current.payments, note: event.target.value } }))} rows={2} placeholder="Ex.: informe se precisa de troco." /></Field>
        </div>
      </Section>

      <Section icon={<Package />} title="Produtos e disponibilidade" description="O cadastro de produtos agora inclui disponibilidade, destaque e ordem.">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="rounded-xl bg-[#f7eff8] p-4">
            <strong className="text-lg">{products.filter((product) => product.active && product.availableToday).length}</strong>
            <p className="text-sm text-[var(--muted)]">de {products.length} produtos ativos e disponíveis hoje</p>
          </div>
          <Link href="/produtos" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--purple)] px-5 text-sm font-bold text-white">Gerenciar produtos</Link>
        </div>
      </Section>

      <Section icon={<BadgePercent />} title="Promoções" description="Promoções ativas aparecem no delivery; uma delas pode ganhar destaque na página inicial.">
        <div className="grid gap-3">
          {settings.promotions.map((promotion) => (
            <article key={promotion.id} className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[#fffdfa] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Título"><Input value={promotion.title} onChange={(event) => updatePromotion(promotion.id, { title: event.target.value })} /></Field>
                <Field label="Preço"><Input type="number" min="0" step="0.01" value={promotion.price} onChange={(event) => updatePromotion(promotion.id, { price: Math.max(0, Number(event.target.value) || 0) })} /></Field>
                <Field label="Descrição"><Textarea value={promotion.description} onChange={(event) => updatePromotion(promotion.id, { description: event.target.value })} rows={2} /></Field>
                <Field label="Validade (opcional)"><Input type="date" value={promotion.validUntil ?? ""} onChange={(event) => updatePromotion(promotion.id, { validUntil: event.target.value || undefined })} /></Field>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Toggle compact label="Ativa" checked={promotion.active} onChange={(value) => updatePromotion(promotion.id, { active: value })} />
                <Toggle compact label="Destaque na página inicial" checked={promotion.featuredOnHome} onChange={(value) => updatePromotion(promotion.id, { featuredOnHome: value })} />
                <button type="button" onClick={() => removePromotion(promotion.id)} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-red-700 hover:bg-red-50"><Trash2 size={16} /> Excluir</button>
              </div>
              <p className="text-xs text-[var(--muted)]">O envio de imagens poderá ser adicionado em uma próxima versão.</p>
            </article>
          ))}
          {!settings.promotions.length && <Empty text="Nenhuma promoção cadastrada." />}
          <Button type="button" variant="secondary" onClick={addPromotion} className="w-full sm:w-fit"><Plus size={17} /> Adicionar promoção</Button>
        </div>
      </Section>

      <Section icon={<Settings2 />} title="Adicionais do açaí" description="Os três primeiros continuam grátis; defina o valor cobrado a partir do quarto.">
        <ConfigurableList items={settings.acaiExtras} kind="extra" onAdd={() => addItem("acaiExtras")} onUpdate={(id, patch) => updateItem("acaiExtras", id, patch)} onRemove={(id) => removeItem("acaiExtras", id)} />
      </Section>

      <Section icon={<IceCreamBowl />} title="Sabores" description="Gerencie separadamente os sabores de sorvete e de milk-shake.">
        <h3 className="font-extrabold">Sabores de sorvete</h3>
        <ConfigurableList items={settings.iceCreamFlavors} kind="flavor" onAdd={() => addItem("iceCreamFlavors")} onUpdate={(id, patch) => updateItem("iceCreamFlavors", id, patch)} onRemove={(id) => removeItem("iceCreamFlavors", id)} />
        <div className="border-t border-[var(--border)] pt-5">
          <h3 className="font-extrabold">Sabores de milk-shake</h3>
          <ConfigurableList items={settings.milkshakeFlavors} kind="flavor" onAdd={() => addItem("milkshakeFlavors")} onUpdate={(id, patch) => updateItem("milkshakeFlavors", id, patch)} onRemove={(id) => removeItem("milkshakeFlavors", id)} />
        </div>
      </Section>

      <Section icon={<MapPin />} title="Textos e contatos do site" description="Atualize os principais textos públicos sem alterar o código.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frase principal do site"><Input value={settings.site.headline} onChange={(event) => setSite("headline", event.target.value)} /></Field>
          <Field label="Subtítulo"><Textarea value={settings.site.subtitle} onChange={(event) => setSite("subtitle", event.target.value)} rows={2} /></Field>
          <Field label="WhatsApp"><Input value={settings.site.whatsapp} onChange={(event) => setSite("whatsapp", event.target.value)} placeholder="(00) 00000-0000" /></Field>
          <Field label="Endereço"><Input value={settings.site.address} onChange={(event) => setSite("address", event.target.value)} /></Field>
          <Field label="Instagram"><Input value={settings.site.instagram} onChange={(event) => setSite("instagram", event.target.value)} placeholder="@sorveteriadamanu" /></Field>
          <Field label="Horário exibido"><Input value={settings.site.displayedHours} onChange={(event) => setSite("displayedHours", event.target.value)} /></Field>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, description, children, open = false }: { icon: ReactNode; title: string; description: string; children: ReactNode; open?: boolean }) {
  return (
    <Card className="p-0">
      <details open={open} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4eaf4] text-[var(--purple)] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          <span className="min-w-0 flex-1"><strong className="block text-base sm:text-lg">{title}</strong><span className="mt-0.5 block text-xs font-normal text-[var(--muted)] sm:text-sm">{description}</span></span>
          <span className="text-xl text-[var(--muted)] transition group-open:rotate-45">+</span>
        </summary>
        <div className="grid gap-5 border-t border-[var(--border)] p-4 sm:p-5">{children}</div>
      </details>
    </Card>
  );
}

function Toggle({ label, description, checked, onChange, compact = false }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void; compact?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white ${compact ? "min-h-10 px-3 py-2" : "min-h-16 p-3"}`}>
      <span className="min-w-0"><strong className="block text-sm">{label}</strong>{description && <span className="mt-0.5 block text-xs font-normal leading-relaxed text-[var(--muted)]">{description}</span>}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-[var(--purple)] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

function ConfigurableList({ items, kind, onAdd, onUpdate, onRemove }: { items: ConfigurableItem[]; kind: "extra" | "flavor"; onAdd: () => void; onUpdate: (id: string, patch: Partial<ConfigurableItem>) => void; onRemove: (id: string) => void }) {
  return (
    <div className="mt-3 grid gap-2">
      {items.map((item) => (
        <div key={item.id} className="grid gap-2 rounded-xl border border-[var(--border)] bg-[#fffdfa] p-3 sm:grid-cols-[minmax(180px,1fr)_140px_auto_auto] sm:items-end">
          <Field label="Nome"><Input value={item.name} onChange={(event) => onUpdate(item.id, { name: event.target.value })} /></Field>
          {kind === "extra"
            ? <Field label="Valor após 3 grátis"><Input type="number" min="0" step="0.01" value={item.extraPrice ?? 0} onChange={(event) => onUpdate(item.id, { extraPrice: Math.max(0, Number(event.target.value) || 0) })} /></Field>
            : <Field label="Cor da prévia"><Input aria-label={`Cor da prévia de ${item.name}`} type="color" value={item.previewColor ?? "#8b5a75"} onChange={(event) => onUpdate(item.id, { previewColor: event.target.value })} className="p-2" /></Field>}
          <Toggle compact label={item.available ? "Disponível" : "Indisponível"} checked={item.available} onChange={(value) => onUpdate(item.id, { available: value })} />
          <button type="button" aria-label={`Excluir ${item.name}`} onClick={() => onRemove(item.id)} className="grid h-11 w-11 place-items-center rounded-xl text-red-700 hover:bg-red-50"><Trash2 size={17} /></button>
        </div>
      ))}
      {!items.length && <Empty text={kind === "extra" ? "Nenhum adicional cadastrado." : "Nenhum sabor cadastrado."} />}
      <Button type="button" variant="ghost" onClick={onAdd} className="w-full border border-dashed border-[var(--border)] sm:w-fit"><Plus size={17} /> {kind === "extra" ? "Adicionar adicional" : "Adicionar sabor"}</Button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-sm text-[var(--muted)]">{text}</p>;
}
