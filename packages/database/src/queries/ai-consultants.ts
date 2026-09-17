import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";

export async function listActiveAiConsultants(opts: { category?: string } = {}) {
  let q = getAdminClient()
    .from("AIConsultant").select("*").eq("isActive", true)
    .order("isFeatured", { ascending: false })
    .order("rating", { ascending: false });
  if (opts.category) q = q.eq("category", opts.category);
  const { data, error } = await q;
  if (error) throwIfError({ data: null, error });
  return data ?? [];
}

export async function getAiConsultantById(id: string) {
  const { data, error } = await getAdminClient()
    .from("AIConsultant").select("*").eq("id", id).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}
