import { logger, startTimer } from "./index";

/**
 * Server-side logger for API routes and server components.
 */

export const serverLogger = {
  // ─── API request lifecycle ──────────────────────────────────────────────
  requestStart(requestId: string, method: string, path: string, userId?: string) {
    logger.info("api", "request:start", `${method} ${path}`, {
      requestId,
      method,
      path,
      userId,
    });
    return startTimer();
  },

  requestDone(
    requestId: string,
    method: string,
    path: string,
    status: number,
    durationMs: number,
  ) {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    logger[level]("api", "request:done", `${status} ${method} ${path}`, {
      requestId,
      status,
      durationMs,
    });
  },

  requestError(requestId: string, method: string, path: string, error: unknown) {
    logger.error("api", "request:error", `Failed: ${method} ${path}`, error, {
      requestId,
    });
  },

  // ─── Database ───────────────────────────────────────────────────────────
  dbQuery(queryName: string, durationMs: number, rowCount?: number) {
    logger.debug("db", "query", `${queryName} (${durationMs}ms, ${rowCount ?? "?"} rows)`, {
      queryName,
      durationMs,
      rowCount,
    });
  },

  dbError(queryName: string, error: unknown) {
    logger.error("db", "error", `Query failed: ${queryName}`, error, { queryName });
  },

  // ─── Realtime broadcast ─────────────────────────────────────────────────
  broadcastPublish(channel: string, event: string, payload?: unknown) {
    logger.info("realtime", "publish", `Published ${event} to ${channel}`, {
      channel,
      event,
      payload,
    });
  },

  broadcastError(channel: string, error: unknown) {
    logger.error("realtime", "publish:error", `Broadcast failed: ${channel}`, error, {
      channel,
    });
  },

  // ─── Notifications ──────────────────────────────────────────────────────
  notificationCreate(userId: string, type: string) {
    logger.info("system", "notification:create", `Notification for ${userId}`, {
      userId,
      type,
    });
  },

  // ─── Wallet / Ledger ────────────────────────────────────────────────────
  ledgerTransaction(walletId: string, type: string, amount: number, balance: number) {
    logger.info("wallet", "ledger:transaction", `${type} ₹${amount} → ₹${balance}`, {
      walletId,
      type,
      amount,
      balance,
    });
  },

  ledgerError(walletId: string, error: unknown) {
    logger.error("wallet", "ledger:error", `Ledger error for ${walletId}`, error, {
      walletId,
    });
  },

  // ─── Auth ───────────────────────────────────────────────────────────────
  syncUser(userId: string, role: string, isNew: boolean) {
    logger.info("auth", "sync:user", `${isNew ? "Created" : "Updated"} user ${userId} (${role})`, {
      userId,
      role,
      isNew,
    });
  },

  // ─── Admin ──────────────────────────────────────────────────────────────
  adminAction(adminId: string, action: string, targetType: string, targetId?: string) {
    logger.info("admin", "action", `Admin ${adminId}: ${action} ${targetType}${targetId ? `#${targetId}` : ""}`, {
      adminId,
      action,
      targetType,
      targetId,
    });
  },

  // ─── System ─────────────────────────────────────────────────────────────
  boot(message: string, data?: Record<string, unknown>) {
    logger.info("system", "boot", message, data);
  },
};
