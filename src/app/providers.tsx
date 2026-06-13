"use client";

import { AuthGate } from "@/components/auth-gate";
import { TabPrefetcher } from "@/components/layout/tab-prefetcher";
import { AppDataProvider } from "@/lib/app-data";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppDataProvider>
        <TabPrefetcher />
        {children}
      </AppDataProvider>
    </AuthGate>
  );
}
