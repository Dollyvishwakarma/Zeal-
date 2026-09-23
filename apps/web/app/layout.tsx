import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout, Profile } from "@/components/navigation/AppLayout";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

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
      .from('User')
      .select('id, role, name')
      .eq('id', user.id)
      .single();
    profile = data as Profile;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 antialiased`}>
        <ThemeProvider>
          <AppLayout user={user} profile={profile}>
            {children}
          </AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}