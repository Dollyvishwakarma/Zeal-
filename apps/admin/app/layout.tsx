import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SupabaseAuthProvider } from "@/components/providers/SupabaseAuthProvider";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { QueryProvider } from "@/lib/query/provider";
import "./globals.css";

// Ensure this layout is always rendered dynamically (avoids
// /_not-found prerender crash when providers need a request context)
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin – Zeal",
  description: "Admin dashboard for Zeal platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-900 antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          themes={["light", "dark"]}
          disableTransitionOnChange
        >
          <QueryProvider>
            <SupabaseAuthProvider>
            <RealtimeProvider>
              {children}
            </RealtimeProvider>
            </SupabaseAuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// ADMIN_QUERY_FIX_APPLIED
