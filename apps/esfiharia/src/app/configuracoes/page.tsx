"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  activationDisabled,
  parseStoreReadiness,
  readinessItems,
  StoreReadiness,
} from "@/lib/store-readiness";
import { PaymentMethod } from "@/lib/types";
const weekdays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
interface FormState {
  deliveryOpen: boolean;
  paused: boolean;
  temporaryPause: boolean;
  closedToday: boolean;
  closedMessage: string;
  allowPickup: boolean;
  allowDelivery: boolean;
  deliveryFee: string;
  minimumOrder: string;
  payments: PaymentMethod[];
  pixKey: string;
  paymentNote: string;
  whatsapp: string;
  instagram: string;
  address: string;
  headline: string;
  subtitle: string;
  displayedHours: string;
  hours: { weekday: number; enabled: boolean; open: string; close: string }[];
}
const initial: FormState = {
  deliveryOpen: false,
  paused: true,
  temporaryPause: false,
  closedToday: false,
  closedMessage: "",
  allowPickup: false,
  allowDelivery: false,
  deliveryFee: "0",
  minimumOrder: "0",
  payments: [],
  pixKey: "",
  paymentNote: "",
  whatsapp: "",
  instagram: "",
  address: "",
  headline: "",
  subtitle: "",
  displayedHours: "",
  hours: weekdays.map((_, weekday) => ({
    weekday,
    enabled: false,
    open: "",
    close: "",
  })),
};
export default function SettingsPage() {
  const { snapshot } = useStore();
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const [form, setForm] = useState<FormState>(initial);
  const [exists, setExists] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [readiness, setReadiness] = useState<StoreReadiness | null>(null);
  const [activating, setActivating] = useState(false);
  const [hidden, setHidden] = useState({
    promotions: [] as Record<string, unknown>[],
    addOns: [] as Record<string, unknown>[],
    flavors: [] as Record<string, unknown>[],
  });
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    if (!client || !snapshot) return;
    const id = snapshot.store.id;
    const [settings, hours, promotions, addOns, flavors, readinessResult] =
      await Promise.all([
        client
          .from("store_settings")
          .select("*")
          .eq("store_id", id)
          .maybeSingle(),
        client
          .from("business_hours")
          .select("*")
          .eq("store_id", id)
          .order("weekday"),
        client.from("promotions").select("*").eq("store_id", id),
        client.from("add_ons").select("*").eq("store_id", id),
        client.from("flavors").select("*").eq("store_id", id),
        client.rpc("get_store_readiness", { p_store_id: id }),
      ]);
    setReadiness(parseStoreReadiness(readinessResult.data));
    setHidden({
      promotions: promotions.data ?? [],
      addOns: addOns.data ?? [],
      flavors: flavors.data ?? [],
    });
    if (!settings.data) {
      setExists(false);
      setLoaded(true);
      return;
    }
    const row = settings.data;
    setExists(true);
    setForm({
      deliveryOpen: row.delivery_open,
      paused: row.pause_online_orders,
      temporaryPause: row.temporary_pause,
      closedToday: row.closed_today,
      closedMessage: row.closed_message,
      allowPickup: row.allow_pickup,
      allowDelivery: row.allow_delivery,
      deliveryFee: String(row.delivery_fee),
      minimumOrder: String(row.minimum_order),
      payments: row.accepted_payment_methods,
      pixKey: row.pix_key,
      paymentNote: row.payment_note,
      whatsapp: row.whatsapp,
      instagram: row.instagram,
      address: row.address,
      headline: row.headline,
      subtitle: row.subtitle,
      displayedHours: row.displayed_hours,
      hours: weekdays.map((_, weekday) => {
        const hour = hours.data?.find((item) => item.weekday === weekday);
        return {
          weekday,
          enabled: hour?.enabled ?? false,
          open: hour?.open_time?.slice(0, 5) ?? "",
          close: hour?.close_time?.slice(0, 5) ?? "",
        };
      }),
    });
    setLoaded(true);
  }, [client, snapshot]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function initialize() {
    const { error } = await client!.rpc("initialize_store_configuration", {
      p_store_id: snapshot!.store.id,
    });
    setMessage(
      error
        ? "Não foi possível iniciar a configuração."
        : "Configuração inicial criada com horários desativados.",
    );
    if (!error) await load();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!client || !snapshot) return;
    if (
      form.hours.some(
        (hour) =>
          hour.enabled &&
          (!hour.open || !hour.close || hour.open === hour.close),
      )
    ) {
      setMessage(
        "Informe horários de abertura e fechamento diferentes para os dias habilitados.",
      );
      return;
    }
    const { error } = await client.rpc("save_store_configuration", {
      p_store_id: snapshot.store.id,
      p_settings: {
        delivery_open: form.deliveryOpen,
        pause_online_orders: form.paused,
        temporary_pause: form.temporaryPause,
        closed_today: form.closedToday,
        closed_message: form.closedMessage,
        allow_pickup: form.allowPickup,
        allow_delivery: form.allowDelivery,
        delivery_fee: Number(form.deliveryFee),
        minimum_order: Number(form.minimumOrder),
        free_add_ons_quantity: 0,
        accepted_payment_methods: form.payments,
        pix_key: form.pixKey,
        payment_note: form.paymentNote,
        whatsapp: form.whatsapp,
        instagram: form.instagram,
        address: form.address,
        headline: form.headline,
        subtitle: form.subtitle,
        displayed_hours: form.displayedHours,
        config_version: 1,
      },
      p_business_hours: form.hours.map((hour) => ({
        weekday: hour.weekday,
        enabled: hour.enabled,
        open_time: hour.open || null,
        close_time: hour.close || null,
      })),
      p_promotions: hidden.promotions,
      p_add_ons: hidden.addOns,
      p_flavors: hidden.flavors,
    });
    setMessage(
      error
        ? "Não foi possível salvar as configurações."
        : "Configurações salvas com sucesso.",
    );
    if (!error) await load();
  }
  async function activate() {
    if (!client || !snapshot || activationDisabled(readiness, activating))
      return;
    setActivating(true);
    setMessage("");
    const { error } = await client.rpc("activate_store", {
      p_store_id: snapshot.store.id,
    });
    if (error) {
      setMessage(error.message);
      setActivating(false);
      await load();
      return;
    }
    setMessage("Esfiharia ativada com sucesso.");
    location.reload();
  }
  function payment(method: PaymentMethod, checked: boolean) {
    setForm({
      ...form,
      payments: checked
        ? [...new Set([...form.payments, method])]
        : form.payments.filter((item) => item !== method),
    });
  }
  if (!loaded)
    return (
      <main className="admin-content">
        <div className="empty">Carregando configurações...</div>
      </main>
    );
  if (!exists)
    return (
      <main className="admin-content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Operação</span>
            <h1>Configurações</h1>
          </div>
        </div>
        <div className="empty">
          <h2>Configuração ainda não iniciada</h2>
          <p className="muted">
            Nenhum horário, endereço ou contato será inventado. Inicie uma base
            desativada para preencher os dados reais.
          </p>
          <button className="btn" onClick={() => void initialize()}>
            Iniciar configuração
          </button>
          {message && <p className="notice">{message}</p>}
        </div>
      </main>
    );
  return (
    <main className="admin-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Somente Esfiharia</span>
          <h1>Configurações</h1>
          <p className="muted">
            Sabores, adicionais e builders não fazem parte desta interface.
          </p>
        </div>
      </div>
      <form onSubmit={submit}>
        <section className="panel">
          <h2>Pronto para abrir?</h2>
          <p className="muted">
            A ativação é manual e só fica disponível quando todos os requisitos
            obrigatórios estão concluídos.
          </p>
          <div className="feature-grid">
            {readinessItems.map((item) => {
              const complete = readiness?.requirements[item.key] ?? false;
              return (
                <div className="total-row" key={item.key}>
                  <span>{item.label}</span>
                  <strong>{complete ? "Concluído" : "Pendente"}</strong>
                  {!item.required && <small>Recomendado</small>}
                </div>
              );
            })}
          </div>
          {!snapshot?.store.active && readiness?.ready && (
            <button
              type="button"
              className="btn"
              onClick={() => void activate()}
              disabled={activationDisabled(readiness, activating)}
            >
              {activating ? "Ativando..." : "Ativar Esfiharia"}
            </button>
          )}
          {snapshot?.store.active && (
            <p className="notice">A Esfiharia está ativa.</p>
          )}
        </section>
        <section className="panel">
          <h2>Disponibilidade</h2>
          <div className="feature-grid">
            <label>
              <input
                type="checkbox"
                checked={form.deliveryOpen}
                onChange={(event) =>
                  setForm({ ...form, deliveryOpen: event.target.checked })
                }
              />{" "}
              Loja aberta
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.paused}
                onChange={(event) =>
                  setForm({ ...form, paused: event.target.checked })
                }
              />{" "}
              Pausar pedidos
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.closedToday}
                onChange={(event) =>
                  setForm({ ...form, closedToday: event.target.checked })
                }
              />{" "}
              Fechado hoje
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.allowPickup}
                onChange={(event) =>
                  setForm({ ...form, allowPickup: event.target.checked })
                }
              />{" "}
              Permitir retirada
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.allowDelivery}
                onChange={(event) =>
                  setForm({ ...form, allowDelivery: event.target.checked })
                }
              />{" "}
              Permitir entrega
            </label>
          </div>
          <div className="field">
            <label htmlFor="closed">Mensagem de fechamento</label>
            <textarea
              id="closed"
              value={form.closedMessage}
              onChange={(event) =>
                setForm({ ...form, closedMessage: event.target.value })
              }
            />
          </div>
        </section>
        <section className="panel">
          <h2>Entrega e pagamento</h2>
          <div className="feature-grid">
            <div className="field">
              <label htmlFor="fee">Taxa de entrega</label>
              <input
                id="fee"
                type="number"
                min="0"
                step="0.01"
                value={form.deliveryFee}
                onChange={(event) =>
                  setForm({ ...form, deliveryFee: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="minimum">Pedido mínimo</label>
              <input
                id="minimum"
                type="number"
                min="0"
                step="0.01"
                value={form.minimumOrder}
                onChange={(event) =>
                  setForm({ ...form, minimumOrder: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="pix">Chave Pix</label>
              <input
                id="pix"
                value={form.pixKey}
                onChange={(event) =>
                  setForm({ ...form, pixKey: event.target.value })
                }
              />
            </div>
          </div>
          <div className="actions">
            {(
              ["Pix", "Dinheiro", "Cartão", "A combinar"] as PaymentMethod[]
            ).map((method) => (
              <label key={method}>
                <input
                  type="checkbox"
                  checked={form.payments.includes(method)}
                  onChange={(event) => payment(method, event.target.checked)}
                />{" "}
                {method}
              </label>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Informações públicas</h2>
          {(
            [
              ["headline", "Chamada principal"],
              ["subtitle", "Descrição"],
              ["address", "Endereço"],
              ["whatsapp", "WhatsApp"],
              ["instagram", "Instagram"],
              ["displayedHours", "Horário exibido"],
            ] as const
          ).map(([key, label]) => (
            <div className="field" key={key}>
              <label htmlFor={key}>{label}</label>
              <input
                id={key}
                value={form[key]}
                onChange={(event) =>
                  setForm({ ...form, [key]: event.target.value })
                }
              />
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Horários</h2>
          {form.hours.map((hour, index) => (
            <div className="total-row" key={hour.weekday}>
              <label>
                <input
                  type="checkbox"
                  checked={hour.enabled}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      hours: form.hours.map((item, i) =>
                        i === index
                          ? { ...item, enabled: event.target.checked }
                          : item,
                      ),
                    })
                  }
                />{" "}
                {weekdays[hour.weekday]}
              </label>
              <div>
                <input
                  type="time"
                  value={hour.open}
                  aria-label={`Abertura de ${weekdays[hour.weekday]}`}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      hours: form.hours.map((item, i) =>
                        i === index
                          ? { ...item, open: event.target.value }
                          : item,
                      ),
                    })
                  }
                />{" "}
                <input
                  type="time"
                  value={hour.close}
                  aria-label={`Fechamento de ${weekdays[hour.weekday]}`}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      hours: form.hours.map((item, i) =>
                        i === index
                          ? { ...item, close: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </section>
        {message && <p className="notice">{message}</p>}
        <button className="btn" style={{ marginTop: 20 }}>
          Salvar configurações
        </button>
      </form>
    </main>
  );
}
