"use client";

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { initialProducts } from "@/lib/mock-data";
import { DeliveryBuilderOption, Product, StoreIdentity, StoreSettings } from "@/lib/types";
import { uid } from "@/lib/utils";
import { initialDeliveryBuilderOptions, initialSettings, normalizeSettings } from "@/lib/settings";
import { createBrowserSupabaseClient } from "@/data/supabase/browser";
import { createProductRepository, createSettingsRepository, RepositoryError } from "@/data/repositories";
import { isInternalStoreRoute, parseStorefrontResponse, shouldFetchStorefrontOnMount, type StorefrontData, type StorefrontPublicError } from "@/lib/storefront";

interface StoreContextValue {
  store: StoreIdentity;
  products: Product[];
  settings: StoreSettings;
  deliveryBuilderOptions: DeliveryBuilderOption[];
  settingsSaveError: boolean;
  settingsSaving: boolean;
  dataError: string;
  ready: boolean;
  saveProduct: (
    product: Omit<Product, "id" | "storeId" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  updateSettings: (update: Partial<StoreSettings> | ((current: StoreSettings) => StoreSettings)) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const INITIAL_LOAD_TIMEOUT_MS = 10_000;
const DEMO_STORE: StoreIdentity = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "demo",
  name: "Sorveteria da Manu",
  type: "sorveteria",
};

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

interface StoreProviderProps {
  children: ReactNode;
  initialData?: StorefrontData;
  initialError?: StorefrontPublicError;
}

async function loadStorefrontFromApi(): Promise<StorefrontData> {
  const response = await fetch("/api/storefront", { cache: "no-store" });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "message" in body.error && typeof body.error.message === "string" ? body.error.message : "Não foi possível carregar os dados públicos da loja.";
    throw new Error(message);
  }
  const storefront = parseStorefrontResponse(body);
  if (!storefront) {
    throw new Error("Os dados públicos recebidos da Sorveteria são inválidos.");
  }
  return storefront;
}

function settingsFromPublicStorefront(data: StorefrontData): StoreSettings {
  return normalizeSettings({
    ...data.settings,
    promotions: data.catalog.promotions,
    acaiExtras: data.catalog.addOns,
    iceCreamFlavors: data.catalog.iceCreamFlavors,
    milkshakeFlavors: data.catalog.milkshakeFlavors,
  });
}

export function StoreProvider({ children, initialData, initialError }: StoreProviderProps) {
  const pathname = usePathname();
  const internalRoute = isInternalStoreRoute(pathname);
  const [publicStorefront, setPublicStorefront] = useState<StorefrontData | null>(initialData ?? null);
  const [store, setStore] = useState<StoreIdentity>(initialData?.store ?? DEMO_STORE);
  const [products, setProducts] = useState<Product[]>(initialData?.catalog.products ?? initialProducts);
  const [settings, setSettings] = useState<StoreSettings>(initialData ? settingsFromPublicStorefront(initialData) : initialSettings);
  const [deliveryBuilderOptions, setDeliveryBuilderOptions] = useState<DeliveryBuilderOption[]>(initialData?.catalog.deliveryBuilderOptions ?? initialDeliveryBuilderOptions);
  const [settingsSaveError, setSettingsSaveError] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [dataError, setDataError] = useState(initialError?.message ?? "");
  const [initialLoadFailed, setInitialLoadFailed] = useState(Boolean(initialError));
  const [privateLoadFailed, setPrivateLoadFailed] = useState(false);
  const [ready, setReady] = useState(Boolean(initialData || initialError));
  const [privateReady, setPrivateReady] = useState(false);
  const settingsDirty = useRef(false);
  const settingsLoaded = useRef(false);
  const settingsRevision = useRef(0);
  const settingsSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const wasInternalRoute = useRef(internalRoute);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!shouldFetchStorefrontOnMount(initialData, initialError)) return;
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
      const [
        {
          data: { session },
        },
        storefront,
      ] = await withTimeout(Promise.all([client.auth.getSession(), loadStorefrontFromApi()]));

      const resolvedStore = storefront.store;
      const catalog = storefront.catalog;
      setPublicStorefront(storefront);
      setStore(resolvedStore);

      let isOwner = false;
      let loadedProducts = catalog.products;
      let loadedSettings = storefront.settings;
      const user = session?.user;

      if (user) {
        const { data: ownerAccess, error: accessError } = await withTimeout(client.rpc("is_owner_of_store", { p_store_id: resolvedStore.id }));
        if (accessError) throw accessError;
        isOwner = ownerAccess === true;

        if (isOwner) {
          const settingsRepository = createSettingsRepository(client, resolvedStore);
          const [privateSettings, ownerProducts] = await withTimeout(Promise.all([settingsRepository.get(), createProductRepository(client, resolvedStore).list()]));
          if (privateSettings.error || ownerProducts.error) throw new Error("Falha ao carregar os dados administrativos da loja.");
          loadedSettings = privateSettings.data;
          loadedProducts = ownerProducts.data;
        }
      }

      setProducts(loadedProducts);
      setDeliveryBuilderOptions(catalog.deliveryBuilderOptions);
      setSettings(
        normalizeSettings({
          ...loadedSettings,
          promotions: isOwner ? loadedSettings.promotions : catalog.promotions,
          acaiExtras: isOwner ? loadedSettings.acaiExtras : catalog.addOns,
          iceCreamFlavors: isOwner ? loadedSettings.iceCreamFlavors : catalog.iceCreamFlavors,
          milkshakeFlavors: isOwner ? loadedSettings.milkshakeFlavors : catalog.milkshakeFlavors,
        }),
      );
      settingsLoaded.current = true;
      setReady(true);
    })().catch((error) => {
      setDataError(error instanceof Error ? error.message : "Não foi possível carregar os dados da loja. Verifique sua conexão e tente novamente.");
      setInitialLoadFailed(true);
      setReady(true);
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialData, initialError]);

  useEffect(() => {
    if (!initialData || initialError) return;
    settingsLoaded.current = true;

    if (!internalRoute) {
      const shouldRefreshPublicData = wasInternalRoute.current;
      wasInternalRoute.current = false;
      if (!shouldRefreshPublicData) return;

      void withTimeout(loadStorefrontFromApi())
        .then((storefront) => {
          setPublicStorefront(storefront);
          setDataError("");
        })
        .catch(() => {
          setDataError("Não foi possível atualizar os dados públicos da loja. Tente novamente.");
        });
      return;
    }

    wasInternalRoute.current = true;
    queueMicrotask(() => {
      setPrivateReady(false);
      setPrivateLoadFailed(false);
    });

    const client = createBrowserSupabaseClient();
    void (async () => {
      if (!client) throw new Error("O Supabase não está configurado neste ambiente.");
      const {
        data: { session },
      } = await withTimeout(client.auth.getSession());
      if (!session?.user) throw new Error("Sua sessão expirou. Entre novamente.");

      const { data: ownerAccess, error: accessError } = await withTimeout(client.rpc("is_owner_of_store", { p_store_id: initialData.store.id }));
      if (accessError) throw accessError;
      if (ownerAccess !== true) {
        throw new Error("Sua conta não possui acesso à Sorveteria.");
      }

      const settingsRepository = createSettingsRepository(client, initialData.store);
      const [privateSettings, ownerProducts] = await withTimeout(Promise.all([settingsRepository.get(), createProductRepository(client, initialData.store).list()]));
      if (privateSettings.error || ownerProducts.error) {
        throw new Error("Não foi possível carregar os dados administrativos da loja.");
      }

      setStore(initialData.store);
      setProducts(ownerProducts.data);
      setSettings(normalizeSettings(privateSettings.data));
      setDeliveryBuilderOptions(initialData.catalog.deliveryBuilderOptions);
      setDataError("");
      setPrivateReady(true);
    })().catch((error) => {
      setDataError(error instanceof Error ? error.message : "Não foi possível carregar os dados administrativos da loja.");
      setPrivateLoadFailed(true);
    });
  }, [initialData, initialError, internalRoute]);

  useEffect(() => {
    if (!ready || !settingsLoaded.current || !settingsDirty.current) return;
    const revision = settingsRevision.current;
    const timer = window.setTimeout(() => {
      settingsSaveQueue.current = settingsSaveQueue.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const client = createBrowserSupabaseClient();
            if (!client) {
              if (revision === settingsRevision.current) {
                setSettingsSaveError(true);
                setSettingsSaving(false);
              }
              return;
            }
            const result = await createSettingsRepository(client, store).update(settings);
            if (revision !== settingsRevision.current) return;
            setSettingsSaving(false);
            setSettingsSaveError(Boolean(result.error));
            if (result.error) setDataError(settingsSaveMessage(result.error));
            else {
              settingsDirty.current = false;
              setDataError("");
            }
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
  }, [settings, ready, store]);

  const saveProduct: StoreContextValue["saveProduct"] = async (input) => {
    const client = createBrowserSupabaseClient();
    if (!client) {
      if (process.env.NODE_ENV !== "development") return false;
      const now = new Date().toISOString();
      const product = {
        ...input,
        id: input.id ?? uid(),
        createdAt: now,
        updatedAt: now,
      } as Product;
      setProducts((current) => (input.id ? current.map((item) => (item.id === input.id ? { ...item, ...product, createdAt: item.createdAt } : item)) : [product, ...current]));
      return true;
    }
    const repository = createProductRepository(client, store);
    const result = input.id ? await repository.update(input.id, input) : await repository.create(input);
    if (result.error) {
      setDataError("Não foi possível salvar o produto.");
      return false;
    }
    setDataError("");
    setProducts((current) => (input.id ? current.map((item) => (item.id === result.data.id ? result.data : item)) : [result.data, ...current]));
    return true;
  };

  const deleteProduct = async (id: string) => {
    const client = createBrowserSupabaseClient();
    if (!client) {
      if (process.env.NODE_ENV !== "development") return false;
      setProducts((current) => current.filter((item) => item.id !== id));
      return true;
    }
    const result = await createProductRepository(client, store).delete(id);
    if (result.error) {
      setDataError("Não foi possível excluir o produto.");
      return false;
    }
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

  const publicSettings = publicStorefront ? settingsFromPublicStorefront(publicStorefront) : null;
  const usePublicData = Boolean(publicStorefront && !internalRoute);
  const contextReady = ready && (!initialData || !internalRoute || privateReady);

  if (initialLoadFailed || (internalRoute && privateLoadFailed)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbf7f0] p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Não foi possível carregar a loja</h1>
          <p className="mt-2 text-sm text-red-700">{dataError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-11 rounded-xl bg-[var(--purple)] px-5 text-sm font-bold text-white">
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }
  if (!contextReady) {
    return (
      <main role="status" className="grid min-h-screen place-items-center bg-[#fbf7f0] text-sm text-[var(--muted)]">
        <div className="grid justify-items-center gap-3">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#d8c7d9] border-t-[var(--purple)]" aria-hidden="true" />
          Carregando dados da sorveteria...
        </div>
      </main>
    );
  }
  return (
    <StoreContext.Provider
      value={{
        store: usePublicData ? publicStorefront!.store : store,
        products: usePublicData ? publicStorefront!.catalog.products : products,
        settings: usePublicData ? publicSettings! : settings,
        deliveryBuilderOptions: usePublicData ? publicStorefront!.catalog.deliveryBuilderOptions : deliveryBuilderOptions,
        settingsSaveError,
        settingsSaving,
        dataError,
        ready: contextReady,
        saveProduct,
        deleteProduct,
        updateSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return store;
}
