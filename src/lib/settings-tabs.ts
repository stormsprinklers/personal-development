export const SETTINGS_TABS = [
  { id: "cloud", label: "Account & sync" },
  { id: "accountability", label: "Accountability" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export function parseSettingsTab(value: string | null | undefined): SettingsTabId {
  if (value === "accountability") return "accountability";
  return "cloud";
}
