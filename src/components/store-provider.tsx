"use client";

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { initialOrders, initialProducts } from "@/lib/mock-data";
import { DeliveryBuilderOption, LegacyOrderStatus, LegacyPaymentMethod, NewOrder, Order, PaymentMethod, Product, StoreSettings } from "@/lib/types";
import { uid } from "@/lib/utils";
import { createPublicOrderCode } from "@/lib/order-code";
import { initialDeliveryBuilderOptions, initialSettings, normalizeSettings } from "@/lib/settings";
import { createBrowserSupabaseClient } from "@/data/supabase/browser";
import { createCatalogRepository, createProductRepository, createSettingsRepository, RepositoryError } from "@/data/repositories";

interface StoreContextValue {
  products: Product[];
  orders: Order[];
  settings: StoreSettings;
  deliveryBuilderOptions: DeliveryBuilderOption[];
  settingsSaveError: boolean;
  settingsSaving: boolean;
  dataError: string;
  ready: boolean;
  saveProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  updateSettings: (update: Partial<StoreSettings> | ((current: StoreSettings) => StoreSettings)) => void;
  addOrder: (order: NewOrder) => string;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  refreshOrders: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const INITIAL_LOAD_TIMEOUT_MS = 10_000;

async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs = INITIAL_LOAD_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Tempo limite excedido ao carregar os dados da loja.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function settingsSaveMessage(error: RepositoryError): string {
  const message = error.message.toLowerCase();
  if (error.status === 401 || error.status === 403 || error.code === "42501") {
    return "Sua sessão não permite alterar estas configurações. Entre novamente.";
  }
  if (error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST205") {
    return "O banco de dados ainda não está atualizado para esta configuração.";
  }
  if (error.status === 422 || error.code?.startsWith("22") || error.code?.startsWith("23")) {
    return "Revise os valores informados antes de salvar.";
  }
  if (message.includes("fetch") || message.includes("network") || message.includes("conexão")) {
    return "Não foi possível se conectar ao servidor.";
  }
  return "Não foi possível salvar as configurações.";
}

function normalizeOrder(order: Partial<Order> & Pick<Order, "id" | "customerName" | "items" | "paymentMethod" | "total" | "createdAt" | "updatedAt">): Order {
  const legacyStatus = order.status as LegacyOrderStatus | undefined;
  const paymentStatus = order.paymentStatus ?? (legacyStatus === "paid" ? "paid" : "pending");
  const orderStatus = order.orderStatus ?? (legacyStatus === "canceled" ? "canceled" : legacyStatus === "paid" ? "delivered" : "new");
  const rawPaymentMethod = order.paymentMethod as PaymentMethod | LegacyPaymentMethod;
  return {
    ...order,
    paymentMethod: rawPaymentMethod === "Fiado/Outro" ? "A combinar" : rawPaymentMethod,
    paymentStatus,
    orderStatus,
    status: orderStatus === "canceled" ? "canceled" : paymentStatus === "paid" ? "paid" : "pending_payment",
    origin: order.origin ?? "internal",
    deliveryType: order.deliveryType ?? "pickup",
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [deliveryBuilderOptions, setDeliveryBuilderOptions] = useState<DeliveryBuilderOption[]>(initialDeliveryBuilderOptions);
  const [settingsSaveError, setSettingsSaveError] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [dataError, setDataError] = useState("");
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const settingsDirty = useRef(false);
  const settingsLoaded = useRef(false);
  const settingsRevision = useRef(0);
  const settingsSaveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const savedOrders = localStorage.getItem("manu-orders");
      if (savedOrders) setOrders((JSON.parse(savedOrders) as Order[]).map(normalizeOrder));
    } catch { /* Mantém os pedidos iniciais se os dados locais estiverem corrompidos. */ }

    const client = createBrowserSupabaseClient();
    if (!client) {
      if (process.env.NODE_ENV === "development") console.warn("Modo de demonstração: catálogo e configurações locais estão ativos.");
      else {
        setDataError("O Supabase não está configurado neste ambiente.");
        setInitialLoadFailed(true);
      }
      setReady(true);
      return;
    }

    void (async () => {
      const catalogRepository = createCatalogRepository(client);
      const settingsRepository = createSettingsRepository(client);
      const [{ data: { session } }, catalog, publicSettings] = await withTimeout(Promise.all([
        client.auth.getSession(),
        catalogRepository.getAvailableCatalog(),
        settingsRepository.getPublic(),
      ]));
      if (catalog.error || publicSettings.error) throw new Error("Falha ao carregar os dados públicos da loja.");

      let isOwner = false;
      let loadedProducts = catalog.data.products;
      let loadedSettings = publicSettings.data;
      const user = session?.user;

      if (user) {
        const { data: profile, error: profileError } = await withTimeout(
          client.from("profiles").select("role, active").eq("id", user.id).maybeSingle(),
        );
        if (profileError) throw profileError;
        isOwner = profile?.active === true && profile.role === "owner";

        if (isOwner) {
          const [privateSettings, ownerProducts] = await withTimeout(Promise.all([
            settingsRepository.get(),
            createProductRepository(client).list(),
          ]));
          if (privateSettings.error || ownerProducts.error) throw new Error("Falha ao carregar os dados administrativos da loja.");
          loadedSettings = privateSettings.data;
          loadedProducts = ownerProducts.data;
        }
      }

      setProducts(loadedProducts);
      setDeliveryBuilderOptions(catalog.data.deliveryBuilderOptions);
      setSettings(normalizeSettings({
        ...loadedSettings,
        promotions: isOwner ? loadedSettings.promotions : catalog.data.promotions,
        acaiExtras: isOwner ? loadedSettings.acaiExtras : catalog.data.addOns,
        iceCreamFlavors: isOwner ? loadedSettings.iceCreamFlavors : catalog.data.iceCreamFlavors,
        milkshakeFlavors: isOwner ? loadedSettings.milkshakeFlavors : catalog.data.milkshakeFlavors,
      }));
      settingsLoaded.current = true;
      setReady(true);
    })().catch(() => {
      setDataError("Não foi possível carregar os dados da loja. Verifique sua conexão e tente novamente.");
      setInitialLoadFailed(true);
      setReady(true);
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("manu-orders", JSON.stringify(orders)); } catch { /* Preserva o estado em memória. */ }
  }, [orders, ready]);

  useEffect(() => {
    if (!ready || !settingsLoaded.current || !settingsDirty.current) return;
    const revision = settingsRevision.current;
    const timer = window.setTimeout(() => {
      settingsSaveQueue.current = settingsSaveQueue.current.catch(() => undefined).then(async () => {
        try {
          const client = createBrowserSupabaseClient();
          if (!client) {
            if (revision === settingsRevision.current) {
              setSettingsSaveError(true);
              setSettingsSaving(false);
            }
            return;
          }
          const result = await createSettingsRepository(client).update(settings);
          if (revision !== settingsRevision.current) return;
          setSettingsSaving(false);
          setSettingsSaveError(Boolean(result.error));
          if (result.error) setDataError(settingsSaveMessage(result.error));
          else { settingsDirty.current = false; setDataError(""); }
        } catch (error) {
          if (revision !== settingsRevision.current) return;
          if (process.env.NODE_ENV === "development") {
            console.error("[StoreProvider] Falha inesperada ao salvar configurações", {
              name: error instanceof Error ? error.name : "Erro desconhecido",
              message: error instanceof Error ? error.message : "A operação não retornou detalhes.",
            });
          }
          setSettingsSaveError(true);
          setSettingsSaving(false);
          setDataError("Não foi possível se conectar ao servidor.");
        }
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [settings, ready]);

  const saveProduct: StoreContextValue["saveProduct"] = async (input) => {
    const client = createBrowserSupabaseClient();
    if (!client) {
      if (process.env.NODE_ENV !== "development") return false;
      const now = new Date().toISOString();
      const product = { ...input, id: input.id ?? uid(), createdAt: now, updatedAt: now } as Product;
      setProducts((current) => input.id ? current.map((item) => item.id === input.id ? { ...item, ...product, createdAt: item.createdAt } : item) : [product, ...current]);
      return true;
    }
    const repository = createProductRepository(client);
    const result = input.id ? await repository.update(input.id, input) : await repository.create(input);
    if (result.error) { setDataError("Não foi possível salvar o produto."); return false; }
    setDataError("");
    setProducts((current) => input.id ? current.map((item) => item.id === result.data.id ? result.data : item) : [result.data, ...current]);
    return true;
  };

  const deleteProduct = async (id: string) => {
    const client = createBrowserSupabaseClient();
    if (!client) {
      if (process.env.NODE_ENV !== "development") return false;
      setProducts((current) => current.filter((item) => item.id !== id));
      return true;
    }
    const result = await createProductRepository(client).delete(id);
    if (result.error) { setDataError("Não foi possível excluir o produto."); return false; }
    setDataError("");
    setProducts((current) => current.filter((item) => item.id !== id));
    return true;
  };

  const updateSettings: StoreContextValue["updateSettings"] = (update) => {
    if (!createBrowserSupabaseClient() && process.env.NODE_ENV === "development") {
      setSettings((current) => normalizeSettings(typeof update === "function" ? update(current) : { ...current, ...update }));
      setSettingsSaveError(false);
      setSettingsSaving(false);
      return;
    }
    settingsDirty.current = true;
    settingsRevision.current += 1;
    setSettingsSaveError(false);
    setSettingsSaving(true);
    setDataError("");
    setSettings((current) => normalizeSettings(typeof update === "function" ? update(current) : { ...current, ...update }));
  };

  const refreshOrders = () => {
    try {
      const savedOrders = localStorage.getItem("manu-orders");
      if (savedOrders) setOrders((JSON.parse(savedOrders) as Order[]).map(normalizeOrder));
    } catch { /* Mantém o estado atual. */ }
  };

  const addOrder = (input: NewOrder) => {
    const id = uid();
    const now = new Date().toISOString();
    setOrders((current) => [normalizeOrder({ ...input, publicCode: input.publicCode ?? createPublicOrderCode(id), id, createdAt: now, updatedAt: now }), ...current]);
    return id;
  };

  const updateOrder = (id: string, patch: Partial<Order>) => setOrders((current) => current.map((order) => {
    if (order.id !== id) return order;
    const translatedPatch = { ...patch };
    if (patch.status && !patch.paymentStatus && !patch.orderStatus) {
      translatedPatch.paymentStatus = patch.status === "paid" ? "paid" : "pending";
      if (patch.status === "canceled") translatedPatch.orderStatus = "canceled";
    }
    return normalizeOrder({ ...order, ...translatedPatch, updatedAt: new Date().toISOString() });
  }));

  if (!ready) return <main role="status" className="grid min-h-screen place-items-center bg-[#fbf7f0] text-sm text-[var(--muted)]"><div className="grid justify-items-center gap-3"><span className="h-7 w-7 animate-spin rounded-full border-2 border-[#d8c7d9] border-t-[var(--purple)]" aria-hidden="true" />Carregando dados da sorveteria...</div></main>;
  if (initialLoadFailed) return <main className="grid min-h-screen place-items-center bg-[#fbf7f0] p-6 text-center"><div><h1 className="text-xl font-bold text-[var(--text)]">Não foi possível carregar a loja</h1><p className="mt-2 text-sm text-red-700">{dataError}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-11 rounded-xl bg-[var(--purple)] px-5 text-sm font-bold text-white">Tentar novamente</button></div></main>;
  return <StoreContext.Provider value={{ products, orders, settings, deliveryBuilderOptions, settingsSaveError, settingsSaving, dataError, ready, saveProduct, deleteProduct, updateSettings, addOrder, updateOrder, refreshOrders }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return store;
}
