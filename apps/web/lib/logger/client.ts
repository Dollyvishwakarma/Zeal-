"use client";

import { logger, startTimer } from "./index";

/**
 * Client-side logger with page-aware helpers.
 */

export const clientLogger = {
  // ─── Page lifecycle ─────────────────────────────────────────────────────
  pageView(route: string, params?: Record<string, string>) {
    logger.info("page", "view", `Entered ${route}`, { route, ...params });
    return startTimer();
  },

  pageReady(route: string, durationMs: number, dataInfo?: Record<string, unknown>) {
    logger.info("page", "ready", `${route} ready in ${durationMs}ms`, {
      route,
      durationMs,
      ...dataInfo,
    });
  },

  pageError(route: string, error: unknown) {
    logger.error("page", "error", `Error on ${route}`, error, { route });
  },

  // ─── Realtime ───────────────────────────────────────────────────────────
  realtimeSubscribe(channel: string) {
    logger.info("realtime", "subscribe", `Subscribed to ${channel}`, { channel });
  },

  realtimeMessage(channel: string, event: string, payload: unknown) {
    logger.debug("realtime", "message", `${channel} → ${event}`, {
      channel,
      event,
      payload,
    });
  },

  realtimeError(channel: string, error: unknown) {
    logger.error("realtime", "error", `Realtime error on ${channel}`, error, { channel });
  },

  realtimeReconnect(channel: string, attempt: number) {
    logger.warn("realtime", "reconnect", `Reconnecting ${channel} (attempt ${attempt})`, {
      channel,
      attempt,
    });
  },

  // ─── Data fetching ──────────────────────────────────────────────────────
  fetchStart(url: string) {
    logger.debug("api", "fetch:start", `GET ${url}`, { url });
    return startTimer();
  },

  fetchDone(url: string, durationMs: number, status: number) {
    const level = status >= 400 ? "warn" : "info";
    logger[level]("api", "fetch:done", `${status} ${url}`, { url, status, durationMs });
  },

  fetchError(url: string, error: unknown) {
    logger.error("api", "fetch:error", `Failed: ${url}`, error, { url });
  },

  // ─── Auth ───────────────────────────────────────────────────────────────
  authLogin(email: string) {
    logger.info("auth", "login:attempt", `Login attempt: ${email}`, { email });
  },

  authSuccess(userId: string) {
    logger.info("auth", "login:success", `Logged in as ${userId}`, { userId });
  },

  authError(error: unknown) {
    logger.error("auth", "login:error", `Auth error`, error);
  },

  authLogout() {
    logger.info("auth", "logout", `Signed out`);
  },

  // ─── Wallet ─────────────────────────────────────────────────────────────
  walletTopup(amount: number) {
    logger.info("wallet", "topup:start", `Top-up ₹${amount}`, { amount });
  },

  walletUpdated(balance: number, delta?: number) {
    logger.info("wallet", "updated", `Balance: ₹${balance}`, { balance, delta });
  },

  // ─── Bookings ───────────────────────────────────────────────────────────
  bookingCreate(consultantId: string, scheduledAt: string) {
    logger.info("booking", "create:start", `Booking with ${consultantId}`, {
      consultantId,
      scheduledAt,
    });
  },

  bookingCreated(bookingId: string) {
    logger.info("booking", "create:success", `Booking ${bookingId} created`, { bookingId });
  },

  // ─── Calls ──────────────────────────────────────────────────────────────
  callStart(bookingId: string) {
    logger.info("call", "start", `Call started for ${bookingId}`, { bookingId });
  },

  callEnd(bookingId: string, durationSeconds: number) {
    logger.info("call", "end", `Call ended (${durationSeconds}s)`, {
      bookingId,
      durationSeconds,
    });
  },

  // ─── AI Chat ────────────────────────────────────────────────────────────
  aiMessage(sessionId: string, length: number) {
    logger.debug("ai", "message", `User message (${length} chars)`, { sessionId });
  },

  aiResponse(sessionId: string, durationMs: number) {
    logger.info("ai", "response", `AI responded in ${durationMs}ms`, { sessionId, durationMs });
  },

  // ─── Admin ──────────────────────────────────────────────────────────────
  adminAction(action: string, data?: Record<string, unknown>) {
    logger.info("admin", "action", `Admin: ${action}`, data);
  },
};
