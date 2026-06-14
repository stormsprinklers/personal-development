export const HEALTH_TABS = [
  { id: "workouts", href: "/health/workouts", label: "Workouts" },
  { id: "food", href: "/health/food", label: "Food" },
] as const;

export type HealthTabId = (typeof HEALTH_TABS)[number]["id"];

export function healthTabFromPathname(pathname: string): HealthTabId {
  if (pathname.startsWith("/health/food")) return "food";
  return "workouts";
}
