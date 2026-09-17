// apps/admin/app/not-found.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Custom 404 for admin app — lightweight, no client providers
// This file is prerendered at build time. Keep it self-contained.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-6 text-center">
      <h1 className="text-6xl font-black text-[#9D7DC5] mb-4">404</h1>
      <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-400 mb-6 max-w-md">
        The admin page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#533AFD]/30 transition-all"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}