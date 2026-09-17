import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GlobalCallListener } from "@/components/global/GlobalCallListener";
import { AppLayout, Profile } from "@/components/navigation/AppLayout";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Zeal | Metaphysical Consultations",
  description: "Enterprise-grade metaphysical consultation platform.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile: Profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, role, wallet_balance, full_name, avatar_url')
      .eq('id', user.id)
      .single();
    profile = data as Profile;
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
        {/* Mount Global Signaling WebSockets */}
        {user && <GlobalCallListener userId={user.id} />}
        
        {/* Core Layout Controller */}
        <AppLayout user={user} profile={profile}>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
