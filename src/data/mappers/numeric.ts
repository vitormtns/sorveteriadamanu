import { PostgresNumeric } from "@/data/supabase/database.types";

export function numericToNumber(value: PostgresNumeric | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function moneyToDatabase(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 100) / 100);
}
