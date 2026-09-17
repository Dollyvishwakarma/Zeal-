import "server-only";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { AdminRole } from "./roles";

const INVITE_TTL_HOURS = 72;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface CreateInviteResult {
  token: string;
  expiresAt: string;
}

export async function createInvite(params: {
  email: string;
  role: AdminRole;
  invitedBy: string;
}): Promise<CreateInviteResult> {
  const sb = getAdminClient();

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_HOURS * 3600 * 1000,
  ).toISOString();

  await sb
    .from("AdminInvite")
    .update({ revokedAt: new Date().toISOString() })
    .eq("email", params.email.toLowerCase())
    .is("acceptedAt", null)
    .is("revokedAt", null);

  const { error } = await sb.from("AdminInvite").insert({
    email: params.email.toLowerCase(),
    role: params.role,
    tokenHash,
    invitedBy: params.invitedBy,
    expiresAt,
  });

  if (error) throw new Error("Failed to create invite: " + error.message);

  return { token, expiresAt };
}

export interface VerifiedInvite {
  id: string;
  email: string;
  role: AdminRole;
  expiresAt: string;
}

export async function verifyInvite(token: string): Promise<VerifiedInvite | null> {
  const sb = getAdminClient();
  const tokenHash = hashToken(token);

  const { data, error } = await sb
    .from("AdminInvite")
    .select("id, email, role, expiresAt, acceptedAt, revokedAt")
    .eq("tokenHash", tokenHash)
    .single();

  if (error || !data) return null;
  if (data.acceptedAt) return null;
  if (data.revokedAt) return null;
  if (new Date(data.expiresAt).getTime() < Date.now()) return null;

  return {
    id: data.id,
    email: data.email,
    role: data.role as AdminRole,
    expiresAt: data.expiresAt,
  };
}

export async function acceptInvite(inviteId: string): Promise<void> {
  const sb = getAdminClient();
  await sb
    .from("AdminInvite")
    .update({ acceptedAt: new Date().toISOString() })
    .eq("id", inviteId);
}

