export const HEALTH_TABS = [
  { id: "workouts", href: "/health/workouts", label: "Workouts" },
] as const;

export type HealthTabId = (typeof HEALTH_TABS)[number]["id"];

export function healthTabFromPathname(_pathname: string): HealthTabId {
  return "workouts";
}
