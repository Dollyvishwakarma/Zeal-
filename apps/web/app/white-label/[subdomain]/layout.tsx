import { notFound } from "next/navigation";
import { prisma } from "@zeal/database/server";
import Link from "next/link";
import type { CSSProperties } from "react";

interface Theme {
  primaryColor: string;
  accentColor: string;
  welcomeMessage: string;
  logoUrl?: string;
}

const DEFAULT_THEME: Theme = {
  primaryColor: "#9D7DC5",
  accentColor: "#533AFD",
  welcomeMessage: "Welcome to my practice",
};

function normalizeTheme(raw: unknown): Theme {
  if (!raw || typeof raw !== "object") return DEFAULT_THEME;
  const t = raw as Record<string, unknown>;
  return {
    primaryColor: typeof t.primaryColor === "string" ? t.primaryColor : DEFAULT_THEME.primaryColor,
    accentColor: typeof t.accentColor === "string" ? t.accentColor : DEFAULT_THEME.accentColor,
    welcomeMessage: typeof t.welcomeMessage === "string" ? t.welcomeMessage : DEFAULT_THEME.welcomeMessage,
    logoUrl: typeof t.logoUrl === "string" ? t.logoUrl : undefined,
  };
}

interface Props { children: React.ReactNode; params: Promise<{ subdomain: string }>; }

export default async function WhiteLabelLayout({ children, params }: Props) {
  const { subdomain } = await params;
  const consultant = await prisma.consultant.findUnique({
    where: { subdomain },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
  });
  if (!consultant || !consultant.subdomainActive) notFound();

  const theme = normalizeTheme(consultant.theme);
  const displayName = consultant.user.name || consultant.user.username;
  const initial = displayName.charAt(0).toUpperCase();
  const style = {
    "--wl-primary": theme.primaryColor,
    "--wl-accent": theme.accentColor,
  } as CSSProperties;

  return (
    <div style={style} className="min-h-screen bg-[#FDFBF7]">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-[#E1C5E7]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={"/white-label/" + subdomain} className="flex items-center gap-2">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt="Logo" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: theme.primaryColor }}>
                {initial}
              </div>
            )}
            <span className="font-semibold text-[#5E4B8B]">{displayName}</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={"/white-label/" + subdomain} className="text-[#5E4B8B] hover:opacity-70">Home</Link>
            <Link href={"/white-label/" + subdomain + "/services"} className="text-[#5E4B8B] hover:opacity-70">Services</Link>
            <Link href={"/white-label/" + subdomain + "/book"} className="px-4 py-2 rounded-xl text-white font-medium" style={{ background: "linear-gradient(135deg, " + theme.primaryColor + ", " + theme.accentColor + ")" }}>
              Book
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[#E1C5E7] py-6 text-center text-xs text-[#B8A1D9]">
        Powered by Zeal
      </footer>
    </div>
  );
}

export const dynamic = "force-dynamic";

