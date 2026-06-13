"use client";

import { useEffect, useState } from "react";
import { todayKey } from "@/lib/timezone";

/** Mountain Standard Time calendar date; only computed on the client to avoid SSR skew. */
export function useTodayKey(): string {
  const [today, setToday] = useState("");

  useEffect(() => {
    const refresh = () => setToday(todayKey());
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return today;
}
