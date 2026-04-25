"use client";

import { AppDataProvider } from "@/lib/app-data";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppDataProvider>{children}</AppDataProvider>;
}
