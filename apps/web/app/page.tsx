"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { 
  ArrowRight, Sparkles, Orbit, Brain, ShieldCheck, Compass, Heart, 
  Layers, MessageSquare, Clock, Zap, Activity, Star, Hash, Hand 
} from "lucide-react";

interface Slide { video: string; title: string; subtitle: string; cta: string; href: string; }
interface Service { id: string; title: string; description: string; icon_name: string; href: string; color: string; bg: string; }
interface Expert { id: string; full_name: string; role: string; sparks: number; }
interface Post { id: string; content: string; created_at: string; profiles: { full_name: string } | null; }

const ALL_SERVICES: Service[] = [
  { id: "1", title: "Daily Horoscope", description: "Planetary alignments & transit forecasts mapped to your sign.", icon_name: "Star", href: "/services/horoscope", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  { id: "2", title: "Janam Kundali", description: "Ultra-precise ephemeris birth charts & house allocations.", icon_name: "Orbit", href: "/services/kundali", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
  { id: "3", title: "Synastry Matchmaking", description: "Relationship compatibility matching using Guna Milan algorithms.", icon_name: "Heart", href: "/services/matchmaking", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
  { id: "4", title: "Arcane Tarot", description: "Neural-mapped temporal 3-card spreads for intuitive guidance.", icon_name: "Layers", href: "/services/tarot", color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  { id: "5", title: "Destiny Numerology", description: "Life path and destiny frequency calculation through numbers.", icon_name: "Hash", href: "/services/numerology", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { id: "6", title: "Palmistry Vision", description: "AI line extraction and life-energy readings from palm scans.", icon_name: "Hand", href: "/services/palmistry", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
];

const SLIDES: Slide[] = [
  { video: "https://assets.mixkit.co/videos/preview/mixkit-spinning-earth-in-space-from-a-satellite-39525-large.mp4", title: "Welcome to Zeal", subtitle: "The ultimate convergence of ancient metaphysics and Groq-accelerated AI.", cta: "Explore Free Tools", href: "#services" },
  { video: "https://assets.mixkit.co/videos/preview/mixkit-hud-interface-with-neon-lines-and-geometric-shapes-31293-large.mp4", title: "Neural Astrologers", subtitle: "Sub-second planetary ephemeris calculations mapped to digital sentience.", cta: "Consult the Engine", href: "#services" },
  { video: "https://assets.mixkit.co/videos/preview/mixkit-ink-swirling-in-water-438-large.mp4", title: "Human Masters", subtitle: "Connect instantly with verified, elite human practitioners globally.", cta: "View Directory", href: "/ai-consultants" }
];

const SAFE_FALLBACK_SLIDE: Slide = { video: "https://assets.mixkit.co/videos/preview/mixkit-spinning-earth-in-space-from-a-satellite-39525-large.mp4", title: "Zeal Intelligence", subtitle: "Initializing cosmic systems...", cta: "Enter", href: "#services" };

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [dbStatus, setDbStatus] = useState<"connecting" | "live" | "fallback">("connecting");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  // FIX: Guaranteed fallback prevents TS2532 error
  const activeSlide: Slide = SLIDES[currentSlide] || SAFE_FALLBACK_SLIDE;

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % SLIDES.length), 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [resExperts, resPosts] = await Promise.all([
          supabase.from("profiles").select("id, full_name, role, sparks").in("role", ["admin", "superadmin"]).order("sparks", { ascending: false }).limit(4),
          supabase.from("consultant_posts").select("id, content, created_at, profiles(full_name)").order("created_at", { ascending: false }).limit(6)
        ]);

        if (!isMounted) return;
        
        if (resExperts.data?.length) {
          setExperts(resExperts.data as Expert[]);
        } else {
          setExperts([
            { id: "e1", full_name: "Acharya Rajesh", role: "Vedic & Dasha Expert", sparks: 14500 },
            { id: "e2", full_name: "Dr. Elena Vance", role: "Hellenistic Astrology", sparks: 9800 },
            { id: "e3", full_name: "Master Chen", role: "Feng Shui & Bazi", sparks: 5420 },
            { id: "e4", full_name: "Mira K.", role: "Arcane Tarot Master", sparks: 4100 },
          ]);
        }

        if (resPosts.data?.length) {
          const formattedPosts = resPosts.data.map(p => ({
            id: p.id, content: p.content, created_at: p.created_at,
            profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
          }));
          setPosts(formattedPosts as Post[]);
        }
        setDbStatus("live");
      } catch (error) {
        setDbStatus("fallback");
        setExperts([
          { id: "e1", full_name: "Acharya Rajesh", role: "Vedic & Dasha Expert", sparks: 14500 },
          { id: "e2", full_name: "Dr. Elena Vance", role: "Hellenistic Astrology", sparks: 9800 },
        ]);
      }
    };

    loadData();

    const channel = supabase.channel("live-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "consultant_posts" }, async (payload) => {
        try {
          const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", payload.new.consultant_id).single();
          const newPost: Post = { 
            id: payload.new.id, content: payload.new.content, created_at: payload.new.created_at,
            profiles: { full_name: profileData?.full_name || "Verified Consultant" } 
          };
          setPosts((current) => [newPost, ...current].slice(0, 8));
        } catch (err) {}
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && dbStatus !== "fallback") setDbStatus("live");
      });

    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [supabase, dbStatus]);

  const getIcon = (name: string) => {
    switch (name) {
      case "Star": return <Star size={28} strokeWidth={1.5} />;
      case "Orbit": return <Orbit size={28} strokeWidth={1.5} />;
      case "Heart": return <Heart size={28} strokeWidth={1.5} />;
      case "Layers": return <Layers size={28} strokeWidth={1.5} />;
      case "Hash": return <Hash size={28} strokeWidth={1.5} />;
      case "Hand": return <Hand size={28} strokeWidth={1.5} />;
      default: return <Zap size={28} strokeWidth={1.5} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 selection:bg-purple-500/30 font-sans overflow-hidden transition-colors duration-500">
      
      {/* 1. CINEMATIC HERO SLIDER */}
      <section className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200 via-slate-50 to-slate-50 dark:from-purple-900/20 dark:via-slate-950 dark:to-slate-950 z-0 transition-colors duration-500" />
        
        <AnimatePresence mode="wait">
          <motion.div key={currentSlide} initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5, ease: "easeInOut" }} className="absolute inset-0 w-full h-full z-0">
            <video src={activeSlide.video} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-10 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/60 to-transparent dark:from-slate-950 dark:via-slate-950/60 dark:to-transparent transition-colors duration-500" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 text-center px-4 max-w-5xl mt-16">
          <AnimatePresence mode="wait">
            <motion.div key={currentSlide} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-purple-100/50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 font-medium text-xs uppercase tracking-[0.15em] backdrop-blur-md mb-8 shadow-sm">
                <Sparkles size={14} className="text-purple-500 dark:text-purple-400" /> 6 Free AI Cosmic Suites
              </motion.div>
              <h1 className="text-5xl sm:text-7xl md:text-[5.5rem] font-medium tracking-tight mb-6 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-slate-800 to-slate-500 dark:from-white dark:to-slate-400">
                {activeSlide.title}
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-normal max-w-2xl mx-auto mb-10 leading-relaxed">
                {activeSlide.subtitle}
              </p>
              <Link href={activeSlide.href} className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-950 rounded-full font-medium hover:bg-purple-600 dark:hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                {activeSlide.cta} <ArrowRight size={18} />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* 2. ALL 6 FREE AI SERVICES BENTO GRID */}
      <section id="services" className="py-32 px-4 sm:px-6 lg:px-8 max-w-[84rem] mx-auto relative z-10">
        <div className="mb-20 text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">Public Free Tier</span>
          <h2 className="text-4xl sm:text-5xl font-medium tracking-tight text-slate-900 dark:text-white mt-2 mb-4">6 Free AI Cosmic Services</h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-light">Zero login required. High-speed mathematical models mapped to ancient Vedic and Western traditions.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ALL_SERVICES.map((s, idx) => (
            <Link key={s.id} href={s.href}>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.08 }} className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-10 rounded-[2.5rem] hover:bg-white dark:hover:bg-slate-800/40 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all group h-full flex flex-col justify-between shadow-sm hover:shadow-xl">
                <div>
                  <div className={`w-16 h-16 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner`}>
                    {getIcon(s.icon_name)}
                  </div>
                  <h3 className="text-2xl font-medium mb-3 text-slate-900 dark:text-slate-100">{s.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-8">{s.description}</p>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 group-hover:gap-3 transition-all">
                  Launch Analysis <ArrowRight size={16} />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. EXPERT REAL ASTROLOGERS GRID */}
      <section id="experts" className="py-32 px-4 sm:px-6 lg:px-8 max-w-[84rem] mx-auto border-t border-slate-200 dark:border-white/5 relative z-10 transition-colors duration-500">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">Engagement & Clout</span>
            <h2 className="text-4xl sm:text-5xl font-medium tracking-tight text-slate-900 dark:text-white mt-2">Verified Master Roster</h2>
            <p className="text-slate-600 dark:text-slate-400 font-light mt-2 text-lg">Ranked by real-time community Sparks and impressions.</p>
          </div>
          <Link href="/ai-consultants" className="text-sm font-medium bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 px-6 py-3 rounded-full hover:bg-purple-600 dark:hover:bg-purple-600 transition-colors shadow-sm">View Directory</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {experts.map((e, idx) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/80 dark:to-slate-900/20 border border-slate-200 dark:border-white/5 p-8 rounded-[2.5rem] hover:border-purple-300 dark:hover:border-white/20 transition-all text-center group shadow-sm hover:shadow-lg">
              <div className="w-24 h-24 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl font-light text-slate-600 dark:text-slate-300 mb-6 group-hover:border-purple-400 transition-colors shadow-sm">
                {e.full_name?.charAt(0) || "A"}
              </div>
              <h4 className="font-medium text-lg text-slate-900 dark:text-slate-200 mb-1">{e.full_name}</h4>
              <p className="text-purple-600 dark:text-purple-400/80 text-xs font-medium uppercase tracking-widest mb-4">{e.role}</p>
              
              <div className="mb-6 inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 px-3 py-1 rounded-full text-xs font-bold text-purple-700 dark:text-purple-300">
                <Sparkles size={13} /> {e.sparks?.toLocaleString() || 0} Sparks
              </div>

              <Link href={`/login?next=/chat?consultant=${e.id}`} className="block w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-purple-600 dark:hover:bg-purple-600 text-slate-700 dark:text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all shadow-sm">
                Consult Now
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. REAL-TIME LIVE FEED */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-[84rem] mx-auto border-t border-slate-200 dark:border-white/5 relative z-10 mb-20 transition-colors duration-500">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-purple-300/20 dark:bg-purple-900/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="mb-16 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span></span>
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white">Live Cosmos Feed</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-light">Real-time planetary updates and guidance from the verified network.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {posts.map((p, i) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/5 p-8 rounded-3xl shadow-sm hover:shadow-md dark:shadow-lg dark:hover:bg-slate-800/60 transition-all"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-700 dark:text-purple-300 font-medium text-lg shadow-inner">
                      {p.profiles?.full_name?.charAt(0) || "C"}
                    </div>
                    <div>
                      <h5 className="font-medium text-sm text-slate-900 dark:text-slate-200">{p.profiles?.full_name || "Verified Consultant"}</h5>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1"><Clock size={12}/> {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <MessageSquare size={18} className="text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-light">{p.content}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
      
    </div>
  );
}
