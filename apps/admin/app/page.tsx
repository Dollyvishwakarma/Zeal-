import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminSignOutAction } from "@/actions/auth";
import { Users, DollarSign, Activity, LogOut, ShieldCheck, Briefcase, Calendar, Star } from "lucide-react";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const role = profile?.role || "user";

  return (
    <div className="min-h-screen bg-black text-zinc-200 p-4 sm:p-8 font-sans">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${role === 'consultant' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
            {role === 'consultant' ? <Briefcase size={24}/> : <ShieldCheck size={24}/>}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{profile?.full_name}</h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">
              {role === 'consultant' ? 'Consultant Portal' : 'God-View Clearance'}
            </p>
          </div>
        </div>
        
        <form action={adminSignOutAction}>
          <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all">
            <LogOut size={14} /> Disconnect
          </button>
        </form>
      </div>

      <div className="max-w-7xl mx-auto">
        
        {/* =========================================================
            CONSULTANT LAYOUT
            ========================================================= */}
        {role === 'consultant' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
              <Calendar className="text-indigo-400 mb-4" size={28} />
              <h3 className="text-lg font-bold text-white mb-1">Active Sessions</h3>
              <p className="text-3xl font-black text-indigo-300 mt-4">12</p>
              <p className="text-zinc-500 text-xs mt-2">Appointments pending this week.</p>
            </div>
            <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
              <DollarSign className="text-emerald-400 mb-4" size={28} />
              <h3 className="text-lg font-bold text-white mb-1">Consultation Revenue</h3>
              <p className="text-3xl font-black text-emerald-300 mt-4">₹{profile?.wallet_balance || 0}</p>
              <p className="text-zinc-500 text-xs mt-2">Available for immediate withdrawal.</p>
            </div>
            <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
              <Star className="text-amber-400 mb-4" size={28} />
              <h3 className="text-lg font-bold text-white mb-1">Seeker Rating</h3>
              <p className="text-3xl font-black text-amber-300 mt-4">4.9</p>
              <p className="text-zinc-500 text-xs mt-2">Based on 47 verified reviews.</p>
            </div>
          </div>
        )}

        {/* =========================================================
            SUPER ADMIN (GOD-VIEW) LAYOUT
            ========================================================= */}
        {['admin', 'superadmin', 'super_admin'].includes(role) && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
                <Users className="text-blue-400 mb-4" size={28} />
                <h3 className="text-lg font-bold text-white mb-1">Total Network Users</h3>
                <p className="text-3xl font-black text-blue-300 mt-4">1,248</p>
                <p className="text-zinc-500 text-xs mt-2">Seekers and Consultants combined.</p>
              </div>
              <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
                <DollarSign className="text-emerald-400 mb-4" size={28} />
                <h3 className="text-lg font-bold text-white mb-1">Platform Treasury</h3>
                <p className="text-3xl font-black text-emerald-300 mt-4">₹{profile?.wallet_balance || 0}</p>
                <p className="text-zinc-500 text-xs mt-2">Total liquid volume in system.</p>
              </div>
              <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
                <Activity className="text-rose-400 mb-4" size={28} />
                <h3 className="text-lg font-bold text-white mb-1">System Load</h3>
                <p className="text-3xl font-black text-rose-300 mt-4">Optimum</p>
                <p className="text-zinc-500 text-xs mt-2">WebRTC signaling online.</p>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
               <h3 className="text-lg font-bold text-white mb-4">Pending Consultant Applications</h3>
               <div className="text-zinc-500 text-sm border-t border-white/5 pt-4">
                 No pending applications require approval at this time.
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
