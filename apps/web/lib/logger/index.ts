/**
 * Central logger — unified interface for client and server.
 *
 * Channels:
 *   api       → HTTP request/response
 *   page      → page views + data fetching
 *   realtime  → WebSocket subscribe/receive/reconnect
 *   db        → database queries + triggers
 *   ai        → AI chat interactions
 *   auth      → login, signup, session
 *   wallet    → transactions, balances
 *   booking   → bookings
 *   call      → call sessions
 *   admin     → admin actions
 *   system    → boot, config, errors
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogChannel =
  | "api"
  | "page"
  | "realtime"
  | "db"
  | "ai"
  | "auth"
  | "wallet"
  | "booking"
  | "call"
  | "admin"
  | "system";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  channel: LogChannel;
  event: string;
  message?: string;
  data?: Record<string, unknown>;
  durationMs?: number;
  requestId?: string;
  userId?: string;
  route?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ─── Level filtering ──────────────────────────────────────────────────────
const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// In development: everything. In production: info and above.
const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === "development" ? "debug" : "info";

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

// ─── Color codes for terminal output ──────────────────────────────────────
const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

const CHANNEL_COLORS: Record<LogChannel, string> = {
  api: "\x1b[35m",       // magenta
  page: "\x1b[34m",      // blue
  realtime: "\x1b[96m",  // bright cyan
  db: "\x1b[94m",        // bright blue
  ai: "\x1b[95m",        // bright magenta
  auth: "\x1b[93m",      // bright yellow
  wallet: "\x1b[92m",    // bright green
  booking: "\x1b[33m",   // yellow
  call: "\x1b[36m",      // cyan
  admin: "\x1b[91m",     // bright red
  system: "\x1b[37m",    // white
};

// ─── In-memory ring buffer (for /debug page) ──────────────────────────────
const MAX_BUFFER = 500;
const buffer: LogEntry[] = [];

export function getRecentLogs(): LogEntry[] {
  return [...buffer];
}

export function clearLogs(): void {
  buffer.length = 0;
}

// ─── Optional remote sink (Supabase DebugLog table) ───────────────────────
async function shipToRemote(entry: LogEntry): Promise<void> {
  // Only ship errors and warnings in production to avoid log spam
  if (process.env.NODE_ENV === "production" && entry.level === "debug") return;

  if (typeof window === "undefined") return;

  try {
    // Fire-and-forget — never await on the hot path
    void fetch("/api/debug/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch(() => {
      // Silently ignore — we don't want logging to break the app
    });
  } catch {
    // Ignore
  }
}

// ─── ID generator ─────────────────────────────────────────────────────────
function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ─── Format for terminal ──────────────────────────────────────────────────
function formatTerminal(entry: LogEntry): string {
  const levelColor = COLORS[entry.level];
  const channelColor = CHANNEL_COLORS[entry.channel];
  const time = new Date(entry.timestamp).toLocaleTimeString("en-IN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const levelTag = `${levelColor}${entry.level.toUpperCase().padEnd(5)}${RESET}`;
  const channelTag = `${channelColor}[${entry.channel}]${RESET}`;
  const durationTag = entry.durationMs !== undefined
    ? ` ${entry.durationMs}ms`
    : "";
  const requestTag = entry.requestId ? ` req=${entry.requestId.slice(0, 8)}` : "";

  let line = `${time} ${levelTag} ${channelTag} ${entry.event}${durationTag}${requestTag}`;

  if (entry.message) {
    line += `\n  → ${entry.message}`;
  }

  if (entry.data && Object.keys(entry.data).length > 0) {
    line += `\n  ${JSON.stringify(entry.data, null, 2).split("\n").join("\n  ")}`;
  }

  if (entry.error) {
    line += `\n  ✗ ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack && process.env.NODE_ENV === "development") {
      line += `\n${entry.error.stack.split("\n").slice(1, 4).join("\n")}`;
    }
  }

  return line;
}

// ─── Main logging function ────────────────────────────────────────────────
export function log(params: {
  level?: LogLevel;
  channel: LogChannel;
  event: string;
  message?: string;
  data?: Record<string, unknown>;
  durationMs?: number;
  requestId?: string;
  userId?: string;
  route?: string;
  error?: unknown;
}): LogEntry {
  const level = params.level ?? "info";

  // Always add to in-memory buffer (even if not printed)
  const entry: LogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    level,
    channel: params.channel,
    event: params.event,
    message: params.message,
    data: params.data,
    durationMs: params.durationMs,
    requestId: params.requestId,
    userId: params.userId,
    route: params.route,
  };

  if (params.error) {
    const err = params.error;
    if (err instanceof Error) {
      entry.error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    } else {
      entry.error = {
        name: "UnknownError",
        message: String(err),
      };
    }
  }

  // Ring buffer (bounded)
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) {
    buffer.shift();
  }

  // Console output (only if level threshold met)
  if (shouldLog(level)) {
    const formatted = formatTerminal(entry);
    if (level === "error") {
      console.error(formatted);
    } else if (level === "warn") {
      console.warn(formatted);
    } else if (level === "debug") {
      console.debug(formatted);
    } else {
      console.debug(formatted);
    }
  }

  // Ship to remote (client-side only, fire-and-forget)
  void shipToRemote(entry);

  return entry;
}

// ─── Convenience methods ──────────────────────────────────────────────────
export const logger = {
  debug: (channel: LogChannel, event: string, message?: string, data?: Record<string, unknown>) =>
    log({ level: "debug", channel, event, message, data }),
  info: (channel: LogChannel, event: string, message?: string, data?: Record<string, unknown>) =>
    log({ level: "info", channel, event, message, data }),
  warn: (channel: LogChannel, event: string, message?: string, data?: Record<string, unknown>) =>
    log({ level: "warn", channel, event, message, data }),
  error: (channel: LogChannel, event: string, message?: string, error?: unknown, data?: Record<string, unknown>) =>
    log({ level: "error", channel, event, message, data, error }),
};

// ─── Timing helpers ───────────────────────────────────────────────────────
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

// ─── Group helpers ────────────────────────────────────────────────────────
export function logGroup(label: string): void {
  if (typeof console.groupCollapsed === "function") {
    console.groupCollapsed(label);
  }
}

export function logGroupEnd(): void {
  if (typeof console.groupEnd === "function") {
    console.groupEnd();
  }
}
