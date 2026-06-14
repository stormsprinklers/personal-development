"use client";

import { AuthGate } from "@/components/auth-gate";
import { TabPrefetcher } from "@/components/layout/tab-prefetcher";
import { TabTransitionProvider } from "@/components/layout/tab-transition";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AppDataProvider } from "@/lib/app-data";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <AppDataProvider>
          <TabTransitionProvider>
            <TabPrefetcher />
            {children}
          </TabTransitionProvider>
        </AppDataProvider>
      </AuthGate>
    </AuthProvider>
  );
}
