import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

export const appRouter = t.router({
  health: t.procedure.query(() => ({ status: "ok" })),
  getUser: t.procedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => ({
      id: input.id,
      name: "Test User",
      email: "test@example.com",
    })),
});

export type AppRouter = typeof appRouter;
