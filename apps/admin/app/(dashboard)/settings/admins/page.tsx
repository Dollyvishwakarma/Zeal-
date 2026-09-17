"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { UserPlus, Loader2, Check, Copy, Shield } from "lucide-react";

const ROLES = [
  { value: "VIEWER",      label: "Viewer",      desc: "Read-only analytics" },
  { value: "SUPPORT",     label: "Support",     desc: "Handle bookings & recordings" },
  { value: "ADMIN",       label: "Admin",       desc: "Manage users and consultants" },
  { value: "SUPER_ADMIN", label: "Super Admin", desc: "Full platform control" },
] as const;

type InviteRole = (typeof ROLES)[number]["value"];

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("VIEWER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message || "Failed to create invite");
      }
      return res.json() as Promise<{ inviteUrl: string; expiresAt: string }>;
    },
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      setEmail("");
    },
  });

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white flex items-center gap-2">
        <Shield className="w-6 h-6 text-[#9D7DC5]" /> Invite Administrator
      </h1>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card-3d p-5 space-y-4">
        <div>
          <label htmlFor="invite-email" className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-1">Email</label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="new-admin@zeal.com"
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white focus:ring-2 focus:ring-[#9D7DC5] outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-2">Role</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                className={cn(
                  "p-3 rounded-xl text-left transition-all border-2",
                  role === r.value
                    ? "bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 border-[#9D7DC5]"
                    : "bg-white dark:bg-gray-900 border-[#E1C5E7] dark:border-gray-700 hover:border-[#9D7DC5]",
                )}
              >
                <p className="font-medium text-sm text-[#5E4B8B] dark:text-white">{r.label}</p>
                <p className="text-xs text-[#B8A1D9] mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {mutation.isError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm" role="alert">
            {mutation.error instanceof Error ? mutation.error.message : "Failed"}
          </div>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!email || mutation.isPending}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><UserPlus className="w-4 h-4" /> Create invite</>}
        </button>

        {inviteUrl && (
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 space-y-2">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Invite created. Share this link:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 text-xs font-mono"
              />
              <button onClick={handleCopy} className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium flex items-center gap-1">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-green-700 dark:text-green-400">Expires in 72 hours.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

import { cn } from "@zeal/ui";

