import { NextResponse } from "next/server";
import { serverLogger } from "./server";

/**
 * Wraps an API route handler with structured logging.
 *
 * Usage:
 *   export const GET = withLogging(async (req, ctx) => { ... });
 */
export function withLogging<T extends (req: Request, ctx?: unknown) => Promise<Response>>(
  handler: T,
  options?: { name?: string },
): T {
  return (async (req: Request, ctx?: unknown) => {
    const requestId =
      (req.headers.get("x-request-id") as string) ||
      crypto.randomUUID().slice(0, 8);

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    const name = options?.name || `${method} ${path}`;

    const stopTimer = serverLogger.requestStart(requestId, method, name);

    try {
      const response = await handler(req, ctx);
      const duration = stopTimer();

      // Clone response to add header
      response.headers.set("X-Request-Id", requestId);

      serverLogger.requestDone(requestId, method, name, response.status, duration);

      return response;
    } catch (error) {
      const duration = stopTimer();
      serverLogger.requestError(requestId, method, name, error);
      serverLogger.requestDone(requestId, method, name, 500, duration);

      return NextResponse.json(
        {
          error: "Internal server error",
          requestId,
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500, headers: { "X-Request-Id": requestId } },
      );
    }
  }) as T;
}
