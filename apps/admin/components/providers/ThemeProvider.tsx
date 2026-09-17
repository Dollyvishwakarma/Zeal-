"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Theme Provider
// Wraps next-themes with Zeal's dark/light palette.
// Preserves the shadcn HSL variables defined in apps/admin/app/globals.css.
// ═══════════════════════════════════════════════════════════════════════════════

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}