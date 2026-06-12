"use client";

import { AuthGate } from "@/components/auth-gate";
import { AppDataProvider } from "@/lib/app-data";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppDataProvider>{children}</AppDataProvider>
    </AuthGate>
  );
}
