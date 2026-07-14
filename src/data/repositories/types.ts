import { AppSupabaseClient } from "@/data/supabase/browser";

export interface RepositoryError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  operation?: string;
  resource?: string;
}

export type RepositoryResult<T> =
  | { data: T; error: null }
  | { data: null; error: RepositoryError };

export type RepositoryClient = AppSupabaseClient;

interface ErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

type ErrorContext = Pick<RepositoryError, "operation" | "resource" | "status">;

export function ok<T>(data: T): RepositoryResult<T> {
  return { data, error: null };
}

export function fail(error: ErrorLike | string, context: ErrorContext = {}): RepositoryResult<never> {
  if (typeof error === "string") return { data: null, error: { message: error, ...context } };
  return {
    data: null,
    error: {
      message: error.message ?? "Não foi possível concluir a operação.",
      code: error.code,
      details: error.details,
      hint: error.hint,
      status: error.status ?? context.status,
      operation: context.operation,
      resource: context.resource,
    },
  };
}
