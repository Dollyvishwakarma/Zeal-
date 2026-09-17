import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";
import { paginate } from "../helpers/pagination";

const BOOKING_SELECT = `
  *,
  user:User!Booking_userId_fkey (id, name, username, avatar, email),
  consultant:Consultant!Booking_consultantId_fkey (
    id, category, perMinuteRate,
    user:User!Consultant_userId_fkey (id, name, username, avatar)
  )
`;

export async function getBookingById(id: string) {
  const { data, error } = await getAdminClient()
    .from("Booking").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}

export async function listBookings(opts: {
  userId?: string; consultantId?: string; status?: string;
  page?: number; limit?: number;
} = {}) {
  const { page, limit, from, to } = paginate(opts.page, opts.limit ?? 20);
  let q = getAdminClient()
    .from("Booking").select(BOOKING_SELECT, { count: "exact" })
    .order("scheduledAt", { ascending: false })
    .range(from, to);
  if (opts.userId)       q = q.eq("userId", opts.userId);
  if (opts.consultantId) q = q.eq("consultantId", opts.consultantId);
  if (opts.status)       q = q.eq("status", opts.status);
  const { data, error, count } = await q;
  if (error) throwIfError({ data: null, error });
  return {
    items: data ?? [], total: count ?? 0, page, limit,
    pages: Math.ceil((count ?? 0) / limit),
    hasMore: from + limit < (count ?? 0),
  };
}

export async function createBooking(payload: Record<string, unknown>) {
  const { data, error } = await getAdminClient()
    .from("Booking").insert(payload).select(BOOKING_SELECT).single();
  return throwIfError({ data, error });
}

export async function updateBooking(id: string, patch: Record<string, unknown>) {
  const { data, error } = await getAdminClient()
    .from("Booking").update(patch).eq("id", id).select(BOOKING_SELECT).single();
  return throwIfError({ data, error });
}

export async function findBookingByPaymentId(paymentId: string) {
  const { data, error } = await getAdminClient()
    .from("Booking").select("*").eq("paymentId", paymentId).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}
