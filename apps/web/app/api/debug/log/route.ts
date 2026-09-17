import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Server-side log sink for client-emitted structured logs.
// Requires an authenticated session to prevent log-flooding attacks.
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entry = (await req.json()) as {
      channel?: string;
      level?: string;
      event?: string;
      message?: string;
      data?: unknown;
      error?: unknown;
    };

    const prefix = "[" + (entry.channel || "unknown") + "/" + (entry.level || "info") + "]";
    const message = prefix + " " + (entry.event || "event") + (entry.message ? " — " + entry.message : "");

    if (entry.level === "error") {
      console.error(message, entry.data ?? "", entry.error ?? "");
    } else if (entry.level === "warn") {
      console.warn(message, entry.data ?? "");
    } else {
      console.debug(message, entry.data ?? "");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

