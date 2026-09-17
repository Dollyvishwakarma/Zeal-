import "server-only";
import { createServerClientFromCookies } from "@zeal/database/server";
import { getUserId } from "./server";
import { AppError, ErrorCode } from "@/lib/errors";

export type Role =
  | "USER" | "CLIENT_ADMIN" | "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "VIEWER";

const ROLE_LEVEL: Record<Role, number> = {
  VIEWER: 10, USER: 20, CLIENT_ADMIN: 40, SUPPORT: 50, ADMIN: 80, SUPER_ADMIN: 100,
};

export interface ActorContext {
  userId: string;
  role: Role;
  email: string | null;
  consultantId: string | null;
}

export async function requireActor(): Promise<ActorContext> {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const supabase = await createServerClientFromCookies();
  const { data: user } = await supabase
    .from("User")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (!user) throw new AppError("User not found", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const { data: consultant } = await supabase
    .from("Consultant")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();

  return {
    userId: user.id,
    role: (user.role as Role) ?? "USER",
    email: user.email,
    consultantId: consultant?.id ?? null,
  };
}

export async function requireRole(min: Role): Promise<ActorContext> {
  const actor = await requireActor();
  if (ROLE_LEVEL[actor.role] < ROLE_LEVEL[min]) {
    throw new AppError(
      "Insufficient permissions — requires " + min,
      403,
      ErrorCode.AUTH_FORBIDDEN,
    );
  }
  return actor;
}

export async function requireConsultant(): Promise<ActorContext & { consultantId: string }> {
  const actor = await requireActor();
  if (!actor.consultantId) {
    throw new AppError("Consultant profile required", 403, ErrorCode.AUTH_FORBIDDEN);
  }
  return { ...actor, consultantId: actor.consultantId };
}
