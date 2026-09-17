import type { PostgrestError } from "@supabase/supabase-js";

export class DbError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = "DbError";
  }
}

export function throwIfError<T>(result: { data: T; error: PostgrestError | null }): T {
  if (result.error) {
    throw new DbError(
      result.error.message,
      result.error.code,
      result.error.details ?? undefined,
      result.error.hint ?? undefined,
    );
  }
  return result.data;
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof DbError && err.code === "23505";
}

export function isNotFound(err: unknown): boolean {
  return err instanceof DbError && err.code === "PGRST116";
}
