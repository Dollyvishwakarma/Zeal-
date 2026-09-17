"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Video, VideoOff, Mic, MicOff, PhoneOff, ShieldCheck, Loader2 } from "lucide-react";

export function LiveRoomView({ sessionId, userId }: { sessionId: string; userId: string }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function fetchSession() {
      const { data, error } = await supabase
        .from("session_requests")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error || !data) {
        alert("Session not found or expired.");
        router.push("/explore");
        return;
      }
      setSession(data);
      setLoading(false);
    }

    fetchSession();

    // Subscribe to session changes (e.g., if cancelled or completed)
    const channel = supabase
      .channel(`room_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "session_requests",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new);
          if (payload.new.status === "completed" || payload.new.status === "cancelled") {
            alert("This session has ended.");
            router.push("/explore");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, router]);

  const endSession = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase
      .from("session_requests")
      .update({ status: "completed" })
      .eq("id", sessionId);

    router.push("/explore");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between bg-slate-900/60 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-white font-black text-sm tracking-wide">Secure Live Room</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <ShieldCheck size={16} className="text-purple-400" /> End-to-End Encrypted Signaling
        </div>
      </div>

      {/* Video Grid Simulation Matrix */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 my-auto py-6">
        <div className="relative aspect-video bg-slate-900/80 border border-white/10 rounded-[2.5rem] overflow-hidden flex items-center justify-center shadow-2xl">
          <div className="absolute bottom-4 left-4 bg-slate-950/80 px-4 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white">
            You {isMuted ? "(Muted)" : ""}
          </div>
          <div className="w-20 h-20 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-2xl">
            {userId.substring(0, 2).toUpperCase()}
          </div>
        </div>

        <div className="relative aspect-video bg-slate-900/80 border border-white/10 rounded-[2.5rem] overflow-hidden flex items-center justify-center shadow-2xl">
          <div className="absolute bottom-4 left-4 bg-slate-950/80 px-4 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white">
            Expert Guide
          </div>
          <div className="w-20 h-20 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-2xl">
            EX
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl shadow-2xl">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-2xl border transition-all ${isMuted ? "bg-rose-600/20 border-rose-500/40 text-rose-400" : "bg-slate-950 border-white/10 text-white hover:bg-white/5"}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`p-4 rounded-2xl border transition-all ${isVideoOff ? "bg-rose-600/20 border-rose-500/40 text-rose-400" : "bg-slate-950 border-white/10 text-white hover:bg-white/5"}`}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <button
          onClick={endSession}
          className="btn-3d px-6 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
        >
          <PhoneOff size={16} /> End Session
        </button>
      </div>
    </div>
  );
}
