import type { PublicCatalog } from "@/data/repositories";
import type { StoreIdentity, StoreSettings } from "@/lib/types";

export interface StorefrontData {
  store: StoreIdentity;
  catalog: PublicCatalog;
  settings: StoreSettings;
}

export type StorefrontErrorCode =
  | "STORE_NOT_FOUND"
  | "SUPABASE_UNAVAILABLE"
  | "STOREFRONT_INVALID";

export interface StorefrontPublicError {
  code: StorefrontErrorCode;
  message: string;
}

export function isInternalStoreRoute(pathname: string): boolean {
  return ["/sistema", "/pedidos", "/produtos", "/configuracoes"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function shouldFetchStorefrontOnMount(
  initialData?: StorefrontData,
  initialError?: StorefrontPublicError,
): boolean {
  return !initialData && !initialError;
}

export function parseStorefrontResponse(value: unknown): StorefrontData | null {
  if (!isRecord(value) || value.success !== true) return null;
  if (
    !isStore(value.store) ||
    !isCatalog(value.catalog) ||
    !isStoreSettings(value.settings)
  ) {
    return null;
  }
  return {
    store: value.store as unknown as StoreIdentity,
    catalog: value.catalog as unknown as PublicCatalog,
    settings: value.settings as unknown as StoreSettings,
  };
}

function isStoreSettings(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    isRecord(value.status) &&
    typeof value.status.deliveryOpen === "boolean" &&
    typeof value.status.pauseOnlineOrders === "boolean" &&
    typeof value.status.closedMessage === "string" &&
    isRecord(value.businessHours) &&
    isRecord(value.delivery) &&
    typeof value.delivery.fee === "number" &&
    typeof value.delivery.minimumOrder === "number" &&
    isRecord(value.payments) &&
    isRecord(value.payments.accepted) &&
    isRecord(value.site) &&
    typeof value.site.headline === "string" &&
    typeof value.site.subtitle === "string"
  );
}

function isStore(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    (value.type === "sorveteria" || value.type === "esfiharia")
  );
}

function isCatalog(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return [
    "products",
    "promotions",
    "addOns",
    "iceCreamFlavors",
    "milkshakeFlavors",
    "deliveryBuilderOptions",
  ].every((field) => Array.isArray(value[field]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
