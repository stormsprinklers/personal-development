"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

type Props = {
  title: string;
  description: string;
  header?: ReactNode;
  children: ReactNode;
};

export function HealthShell({ title, description, header, children }: Props) {
  return (
    <AppShell title={title} description={description} header={header}>
      {children}
    </AppShell>
  );
}
