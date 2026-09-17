// Sentry-compatible observability facade.
// Uses a lightweight internal sink so no external dependency is required.
// When @sentry/nextjs is added later, swap the sink implementations below —
// the public API (captureError, captureMessage, setUser, addBreadcrumb) stays the same.

import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────

export interface ErrorContext {
  [key: string]: unknown;
}

export interface ObservabilityUser {
  id: string;
  email?: string | null;
  role?: string;
}

export type BreadcrumbLevel = "debug" | "info" | "warning" | "error";

export interface Breadcrumb {
  category: string;
  message: string;
  level?: BreadcrumbLevel;
  data?: Record<string, unknown>;
  timestamp?: number;
}

// ─── Module state ─────────────────────────────────────────────────────────

let currentUser: ObservabilityUser | null = null;
const breadcrumbs: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 50;

// ─── Public API ───────────────────────────────────────────────────────────

export function setUser(user: ObservabilityUser | null): void {
  currentUser = user;
  logger.info("system", "observability:setUser", user ? "user set" : "user cleared", {
    userId: user?.id,
    role: user?.role,
  });
}

export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  breadcrumbs.push({ ...breadcrumb, timestamp: breadcrumb.timestamp ?? Date.now() });
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
}

export function captureError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error("system", "capture:error", message, error, {
    ...context,
    userId: currentUser?.id,
    breadcrumbs: breadcrumbs.slice(-10),
    stack,
  });

  // Fire-and-forget forward to server log sink
  if (typeof window !== "undefined") {
    try {
      void fetch("/api/debug/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "system",
          level: "error",
          event: "client:error",
          message,
          data: { ...context, userId: currentUser?.id },
          error: { name: error instanceof Error ? error.name : "Unknown", message, stack },
        }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* ignore */ }
  }
}

export function captureMessage(message: string, context?: ErrorContext): void {
  logger.info("system", "capture:message", message, {
    ...context,
    userId: currentUser?.id,
  });
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

