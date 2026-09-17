"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2 } from "lucide-react";

export function GoogleAuthButton({
  label = "Continue with Google",
  redirectPath = "/explore",
  intent = "user",
}: {
  label?: string;
  redirectPath?: string;
  intent?: "user" | "consultant";
}) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
        ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '') 
        : typeof window !== "undefined" ? window.location.origin : "";
        
      const callbackUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent(
        redirectPath
      )}&intent=${encodeURIComponent(intent)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        alert("Google Sign-In failed: " + error.message);
        setLoading(false);
      }
    } catch (err: any) {
      alert("Unexpected error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="btn-3d w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-black/40 group"
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin text-purple-400" />
      ) : (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
        </svg>
      )}
      <span className="text-slate-200 group-hover:text-white transition-colors">
        {loading ? "Connecting to Google..." : label}
      </span>
    </button>
  );
}
