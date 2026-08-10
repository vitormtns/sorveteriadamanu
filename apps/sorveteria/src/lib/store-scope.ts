import type { StoreIdentity } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertStoreIdentity(store: StoreIdentity): StoreIdentity {
  if (!UUID_PATTERN.test(store.id) || !store.slug || !store.name) {
    throw new Error("A loja resolvida é inválida.");
  }
  return store;
}

export function realtimeStoreFilter(storeId: string): string {
  if (!UUID_PATTERN.test(storeId)) throw new Error("O identificador da loja é inválido.");
  return `store_id=eq.${storeId}`;
}

export function filterByStore<T extends { storeId?: string }>(items: readonly T[], storeId: string): T[] {
  return items.filter((item) => item.storeId === storeId);
}

export function totalByStore<T extends { storeId?: string; total: number }>(items: readonly T[], storeId: string): number {
  return filterByStore(items, storeId).reduce((sum, item) => sum + item.total, 0);
}

export function resourceIdsBelongToStore<T extends { id: string; storeId?: string }>(
  resources: readonly T[],
  resourceIds: readonly string[],
  storeId: string,
): boolean {
  const allowedIds = new Set(filterByStore(resources, storeId).map((resource) => resource.id));
  return resourceIds.every((id) => allowedIds.has(id));
}
