import type { ReactNode } from "react";
import { redirect } from "next/navigation";

/** Finance tab is deprecated; keep API routes, hide the UI. */
export default function DeprecatedFinanceLayout({ children }: { children: ReactNode }) {
  void children;
  redirect("/");
}
