// apps/web/app/api/admin/invites/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI, logAdminAction } from "@/lib/auth/api-guard";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["VIEWER", "SUPPORT", "ADMIN", "SUPER_ADMIN"] as const;

export async function POST(req: Request) {
  const guard = await requireAdminAPI("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const { admin, userId: adminId, email: adminEmail } = guard;

  let body: { email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").toLowerCase().trim();
  const role = body.role;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Generate 32-byte token, hash it for storage
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  // Revoke any previous pending invites for this email
  await admin
    .from("AdminInvite")
    .update({ revokedAt: new Date().toISOString() })
    .eq("email", email)
    .is("acceptedAt", null)
    .is("revokedAt", null);

  const { error } = await admin.from("AdminInvite").insert({
    email,
    role,
    tokenHash,
    invitedBy: adminId,
    expiresAt,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin, {
    adminId,
    action: "INVITE_CREATE",
    targetType: "admin_invite",
    targetId: email,
    metadata: { role },
  });

  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
  const inviteUrl = `${baseUrl}/accept-invite?token=${encodeURIComponent(token)}`;

  return NextResponse.json({
    success: true,
    inviteUrl,
    expiresAt,
    invitedBy: adminEmail,
  });
}