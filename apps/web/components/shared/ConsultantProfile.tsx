"use client";

import { Avatar, AvatarImage, AvatarFallback, Badge, Button } from "@zeal/ui";
import { useRouter } from "next/navigation";
import { Calendar, MessageCircle, Phone } from "lucide-react";

export interface ConsultantProfileData {
  id: string;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  bio?: string | null;
  isOnline?: boolean;
  rating?: number;
  perMinuteRate?: number;
  totalConsultations?: number;
  specialties?: string[];
}

interface ConsultantProfileProps {
  consultant: ConsultantProfileData;
  isAI: boolean;
}

export function ConsultantProfile({ consultant, isAI }: ConsultantProfileProps) {
  const router = useRouter();
  if (!consultant) return null;

  const name = consultant.name || consultant.username || "Consultant";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E1C5E7] dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-24 h-24 border-4 border-[#E1C5E7]">
            <AvatarImage src={consultant.avatar || undefined} alt={name} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white">{name}</h1>
              <Badge variant={consultant.isOnline ? "success" : "secondary"}>
                {consultant.isOnline ? "Online" : "Offline"}
              </Badge>
              {isAI && <Badge variant="outline">AI</Badge>}
            </div>
            {consultant.username && (
              <p className="text-sm text-[#B8A1D9] dark:text-gray-400">@{consultant.username}</p>
            )}
            {consultant.bio && (
              <p className="text-sm text-[#5E4B8B] dark:text-white mt-2">{consultant.bio}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-[#B8A1D9] dark:text-gray-400">
              <span>⭐ {consultant.rating ?? 0}</span>
              <span>•</span>
              <span>₹{consultant.perMinuteRate ?? 0}/min</span>
              <span>•</span>
              <span>{consultant.totalConsultations ?? 0} consultations</span>
            </div>
            {consultant.specialties && consultant.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {consultant.specialties.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="primary" onClick={() => router.push("/booking?consultantId=" + consultant.id)}>
                <Calendar className="w-4 h-4 mr-2" /> Book
              </Button>
              <Button variant="secondary" onClick={() => router.push("/chat/" + consultant.id)}>
                <MessageCircle className="w-4 h-4 mr-2" /> Chat
              </Button>
              <Button variant="secondary" onClick={() => { window.location.href = "/call/" + consultant.id; }}>
                <Phone className="w-4 h-4 mr-2" /> Call
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

