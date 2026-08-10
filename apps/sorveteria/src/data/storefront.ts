import "server-only";

import {
  createCatalogRepository,
  createSettingsRepository,
  type RepositoryError,
} from "@/data/repositories";
import { createSupabaseAdminClient } from "@/data/supabase/admin";
import { resolveCurrentStore } from "@/lib/current-store";
import type {
  StorefrontData,
  StorefrontErrorCode,
  StorefrontPublicError,
} from "@/lib/storefront";
import { parseStorefrontResponse } from "@/lib/storefront";

export class StorefrontLoadError extends Error {
  constructor(
    public readonly code: StorefrontErrorCode,
    message: string,
    public readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "StorefrontLoadError";
  }
}

export async function loadPublicStorefront(): Promise<StorefrontData> {
  let client: ReturnType<typeof createSupabaseAdminClient>;
  try {
    client = createSupabaseAdminClient();
  } catch (error) {
    throw unavailable(error);
  }

  let store: Awaited<ReturnType<typeof resolveCurrentStore>>;
  try {
    store = await resolveCurrentStore(client);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("A loja configurada")
    ) {
      throw new StorefrontLoadError(
        "STORE_NOT_FOUND",
        "A Sorveteria não foi encontrada ou ainda não está ativa.",
        404,
        { cause: error },
      );
    }
    throw unavailable(error);
  }

  const [catalog, settings] = await Promise.all([
    createCatalogRepository(client, store).getAvailableCatalog(),
    createSettingsRepository(client, store).getPublic(),
  ]);

  if (catalog.error || settings.error) {
    const error = catalog.error ?? settings.error;
    if (isUnavailable(error)) throw unavailable(error);
    throw new StorefrontLoadError(
      "STOREFRONT_INVALID",
      "Os dados públicos da Sorveteria estão incompletos ou inválidos.",
      503,
      { cause: error },
    );
  }

  const data: StorefrontData = {
    store,
    catalog: catalog.data,
    settings: settings.data,
  };
  if (!parseStorefrontResponse({ success: true, ...data })) {
    throw new StorefrontLoadError(
      "STOREFRONT_INVALID",
      "Os dados públicos da Sorveteria estão incompletos ou inválidos.",
      503,
    );
  }
  return data;
}

export function getStorefrontPublicError(
  error: unknown,
): StorefrontPublicError {
  if (error instanceof StorefrontLoadError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "SUPABASE_UNAVAILABLE",
    message: "Não foi possível conectar a Sorveteria ao servidor de dados.",
  };
}

export function getStorefrontErrorStatus(error: unknown): number {
  return error instanceof StorefrontLoadError ? error.status : 503;
}

function unavailable(cause: unknown): StorefrontLoadError {
  return new StorefrontLoadError(
    "SUPABASE_UNAVAILABLE",
    "Não foi possível conectar a Sorveteria ao servidor de dados.",
    503,
    { cause },
  );
}

function isUnavailable(error: RepositoryError | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    Boolean(error.status && error.status >= 500) ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("conexão")
  );
}
