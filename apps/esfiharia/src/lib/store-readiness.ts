export interface StoreReadinessRequirements {
  settings: boolean;
  catalog: boolean;
  hours: boolean;
  payment: boolean;
  fulfillment: boolean;
  contact: boolean;
}

export interface StoreReadiness {
  ready: boolean;
  requirements: StoreReadinessRequirements;
  missing: string[];
}

export const readinessItems: {
  key: keyof StoreReadinessRequirements;
  label: string;
  required: boolean;
}[] = [
  { key: "settings", label: "Configuração inicial criada", required: true },
  { key: "catalog", label: "Cardápio configurado", required: true },
  { key: "hours", label: "Horários configurados", required: true },
  { key: "payment", label: "Forma de pagamento configurada", required: true },
  {
    key: "fulfillment",
    label: "Retirada ou entrega configurada",
    required: true,
  },
  {
    key: "contact",
    label: "Endereço e contato configurados",
    required: false,
  },
];

const requiredReadinessKeys = readinessItems
  .filter((item) => item.required)
  .map((item) => item.key);

export function hasRequiredReadiness(
  requirements: StoreReadinessRequirements,
): boolean {
  return requiredReadinessKeys.every((key) => requirements[key]);
}

export function parseStoreReadiness(value: unknown): StoreReadiness | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.ready !== "boolean" ||
    !row.requirements ||
    typeof row.requirements !== "object" ||
    Array.isArray(row.requirements) ||
    !Array.isArray(row.missing) ||
    row.missing.some((item) => typeof item !== "string")
  )
    return null;

  const requirements = row.requirements as Record<string, unknown>;
  if (
    readinessItems.some(
      ({ key }) => typeof requirements[key] !== "boolean",
    )
  )
    return null;

  const parsedRequirements = Object.fromEntries(
    readinessItems.map(({ key }) => [key, requirements[key]]),
  ) as unknown as StoreReadinessRequirements;
  if (row.ready !== hasRequiredReadiness(parsedRequirements)) return null;

  return {
    ready: row.ready,
    requirements: parsedRequirements,
    missing: row.missing as string[],
  };
}

export function activationDisabled(
  readiness: StoreReadiness | null,
  activating = false,
): boolean {
  return activating || !readiness?.ready;
}
