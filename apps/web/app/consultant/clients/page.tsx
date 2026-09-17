"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, Search } from "lucide-react";

interface Client {
  id: string;
  name: string | null;
  email: string | null;
  lastSessionAt: string | null;
  sessions: number;
}

export default function ConsultantClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/consultant/clients")
      .then((r) => r.ok ? r.json() : { clients: [] })
      .then((data) => setClients(data.clients ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-white">Clients</h1>
        <p className="text-sm text-slate-400 mt-1">Your relationship history</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-white placeholder:text-slate-500 focus:border-[#9D7DC5] outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#9D7DC5]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            {query ? "No clients match your search" : "No clients yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-4 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl"
            >
              <div className="w-10 h-10 rounded-full bg-[#9D7DC5]/20 flex items-center justify-center text-[#9D7DC5] font-bold flex-shrink-0">
                {((c.name || c.email || "?")[0] ?? "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{c.name || "Anonymous"}</p>
                <p className="text-xs text-slate-400 truncate">{c.email || "—"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-[#9D7DC5]">{c.sessions}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">sessions</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
