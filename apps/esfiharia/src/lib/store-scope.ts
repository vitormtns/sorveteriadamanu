export function belongsToStore(
  resourceStoreId: string,
  currentStoreId: string,
): boolean {
  return resourceStoreId === currentStoreId;
}

export function filterByStore<T extends { storeId: string }>(
  resources: T[],
  currentStoreId: string,
): T[] {
  return resources.filter((resource) =>
    belongsToStore(resource.storeId, currentStoreId),
  );
}
