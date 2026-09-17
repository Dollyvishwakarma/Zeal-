"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// AI Astrologer Detail — Start Chat wires to conversation RPC
// ═══════════════════════════════════════════════════════════════════════════════

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Zap, Star, Loader2, AlertCircle } from "lucide-react";
import { Button, Badge, Card, CardContent } from "@zeal/ui";
import Link from "next/link";

interface AIDetail {
  id: string;
  name: string;
  username: string;
  avatar: string;
  category: string;
  bio: string;
  rating: number;
  totalConsultations: number;
  isPaid: boolean;
  perMinuteRate: number;
  persona: string | null;
  gender: string | null;
  specialties: string[] | null;
}

export default function AIAstrologerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ai, setAi] = useState<AIDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;

    fetch(`/api/ai/consultants/${params.id}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: AIDetail) => { if (!cancelled) setAi(data); })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [params.id]);

  const handleStartChat = async () => {
    if (!ai) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: ai.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || "Could not start chat");
      }
      const data = (await res.json()) as { conversationId?: string };
      if (data.conversationId) {
        router.push(`/chat/${data.conversationId}`);
      } else {
        throw new Error("No conversation returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start chat");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#9D7DC5]" />
      </div>
    );
  }

  if (!ai) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500">{error || "AI consultant not found"}</p>
        <Link href="/services" className="text-[#9D7DC5] hover:underline mt-2 inline-block">
          ← Back to Services
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-4 py-6"
    >
      <Link
        href="/services"
        className="flex items-center gap-2 text-[#9D7DC5] hover:underline mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Services
      </Link>

      <Card className="border-[#E1C5E7] dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#9D7DC5]/30">
              <img src={ai.avatar} alt={ai.name} className="w-full h-full object-cover" />
              <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white text-[8px] font-bold rounded-full">
                AI
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-[#5E4B8B] dark:text-white">
              {ai.name}
            </h1>
            <p className="text-sm text-[#B8A1D9] capitalize">
              {ai.category.toLowerCase().replace(/_/g, " ")}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-yellow-500 flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-500" />
                {ai.rating.toFixed(1)}
              </span>
              <span className="text-xs text-[#B8A1D9]">
                ({ai.totalConsultations} consultations)
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {ai.isPaid && ai.perMinuteRate > 0 ? (
                <Badge variant="warning">₹{ai.perMinuteRate}/min</Badge>
              ) : (
                <Badge variant="success">Free</Badge>
              )}
              {ai.persona && <Badge variant="outline">{ai.persona}</Badge>}
              {ai.gender && <Badge variant="outline">{ai.gender}</Badge>}
            </div>

            {ai.bio && (
              <p className="mt-4 text-[#5E4B8B] dark:text-white text-left w-full text-sm leading-relaxed">
                {ai.bio}
              </p>
            )}

            {ai.specialties && ai.specialties.length > 0 && (
              <div className="mt-4 w-full text-left">
                <h3 className="text-sm font-medium text-[#5E4B8B] dark:text-white mb-2">
                  Specialties
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ai.specialties.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm w-full">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              className="mt-6 w-full btn-luxury flex items-center justify-center gap-2"
              onClick={handleStartChat}
              disabled={starting}
            >
              {starting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Starting chat...</>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {ai.isPaid && ai.perMinuteRate > 0
                    ? `Start Paid Chat (₹${ai.perMinuteRate}/min)`
                    : "Start Free Chat"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}