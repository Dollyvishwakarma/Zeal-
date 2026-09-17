import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";
import { paginate } from "../helpers/pagination";

const CONSULTANT_SELECT = `
  id, userId, category, specialties, languages, bio, perMinuteRate, isVerified,
  isActive, faith, rating, totalConsultations, earnings, availability, createdAt,
  updatedAt, status, subdomain, subdomainActive, whiteLabelEnabled, theme,
  chatRate, audioRate, videoRate, physicalRate, bufferMinutes,
  user:User!Consultant_userId_fkey (id, name, username, avatar, email)
`;

export async function getVerifiedConsultants(opts: {
  category?: string; search?: string; page?: number; limit?: number;
} = {}) {
  const { page, limit, from, to } = paginate(opts.page, opts.limit ?? 60);
  let q = getAdminClient()
    .from("Consultant").select(CONSULTANT_SELECT, { count: "exact" })
    .eq("status", "VERIFIED").eq("isActive", true)
    .order("rating", { ascending: false })
    .range(from, to);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.search)   q = q.ilike("bio", `%${opts.search}%`);
  const { data, error, count } = await q;
  if (error) throwIfError({ data: null, error });
  return { items: data ?? [], total: count ?? 0, page, limit };
}

export async function getConsultantById(id: string) {
  const { data, error } = await getAdminClient()
    .from("Consultant").select(CONSULTANT_SELECT).eq("id", id).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}

export async function getConsultantByUserId(userId: string) {
  const { data, error } = await getAdminClient()
    .from("Consultant").select("*").eq("userId", userId).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}

export async function getConsultantBySubdomain(subdomain: string) {
  const { data, error } = await getAdminClient()
    .from("Consultant").select("*")
    .eq("subdomain", subdomain).eq("subdomainActive", true).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}

export async function updateConsultant(id: string, patch: Record<string, unknown>) {
  const { data, error } = await getAdminClient()
    .from("Consultant").update(patch).eq("id", id).select("*").single();
  return throwIfError({ data, error });
}
