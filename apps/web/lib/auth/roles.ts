export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "VIEWER";

export const ROLE_LEVEL: Record<AdminRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  SUPPORT: 50,
  VIEWER: 10,
};

export const ADMIN_ROLES: readonly AdminRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
  "VIEWER",
] as const;

export function isAdminRole(value: unknown): value is AdminRole {
  return (
    typeof value === "string" &&
    (ADMIN_ROLES as readonly string[]).includes(value)
  );
}

export function roleAtLeast(role: AdminRole, min: AdminRole): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[min];
}

export function isAdmin(role: AdminRole | null | undefined): role is AdminRole {
  return !!role && isAdminRole(role);
}

