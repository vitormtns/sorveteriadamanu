const STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DEFAULT_STORE_SLUG = "sorveteria";

export function normalizeStoreSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!STORE_SLUG_PATTERN.test(slug)) {
    throw new Error("STORE_SLUG possui um formato inválido.");
  }
  return slug;
}

export function getCurrentStoreSlug(environment?: { STORE_SLUG?: string }): string {
  return normalizeStoreSlug(environment?.STORE_SLUG ?? process.env.STORE_SLUG ?? DEFAULT_STORE_SLUG);
}
