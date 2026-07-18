export const SETTINGS_TABS = [
  { id: "cloud", label: "Account & sync" },
  { id: "accountability", label: "Accountability" },
  { id: "notifications", label: "Notifications" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export function parseSettingsTab(value: string | null | undefined): SettingsTabId {
  if (value === "accountability") return "accountability";
  if (value === "notifications") return "notifications";
  return "cloud";
}
