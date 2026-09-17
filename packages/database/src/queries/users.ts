import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";
import { paginate } from "../helpers/pagination";
import type { Database } from "../types";

type UserRow    = Database["public"]["Tables"]["User"]["Row"];
type UserInsert = Database["public"]["Tables"]["User"]["Insert"];
type UserUpdate = Database["public"]["Tables"]["User"]["Update"];

export async function getUserById(id: string): Promise<UserRow | null> {
  const { data, error } = await getAdminClient().from("User").select("*").eq("id", id).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await getAdminClient().from("User").select("*").eq("email", email).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const { data, error } = await getAdminClient().from("User").select("*").eq("username", username).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}

export async function upsertUser(user: UserInsert): Promise<UserRow> {
  const { data, error } = await getAdminClient()
    .from("User").upsert(user, { onConflict: "id" }).select("*").single();
  return throwIfError({ data, error });
}

export async function updateUser(id: string, patch: UserUpdate): Promise<UserRow> {
  const { data, error } = await getAdminClient()
    .from("User").update(patch).eq("id", id).select("*").single();
  return throwIfError({ data, error });
}

export async function listUsers(opts: {
  page?: number; limit?: number; role?: string; search?: string;
} = {}) {
  const { page, limit, from, to } = paginate(opts.page, opts.limit ?? 50);
  let q = getAdminClient()
    .from("User").select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);
  if (opts.role)   q = q.eq("role", opts.role);
  if (opts.search) q = q.or(`email.ilike.%${opts.search}%,name.ilike.%${opts.search}%,username.ilike.%${opts.search}%`);
  const { data, error, count } = await q;
  if (error) throwIfError({ data: null, error });
  return {
    items: data ?? [], total: count ?? 0, page, limit,
    pages: Math.ceil((count ?? 0) / limit),
    hasMore: from + limit < (count ?? 0),
  };
}

export async function ensureWallet(userId: string) {
  const sb = getAdminClient();
  const existing = await sb.from("Wallet").select("*").eq("userId", userId).maybeSingle();
  if (existing.data) return existing.data;
  const { data, error } = await sb.from("Wallet").insert({ userId }).select("*").single();
  return throwIfError({ data, error });
}
