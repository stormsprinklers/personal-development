export const SETTINGS_TABS = [
  { id: "cloud", label: "Cloud sync" },
  { id: "accountability", label: "Accountability" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export function parseSettingsTab(value: string | null): SettingsTabId {
  if (value === "accountability") return "accountability";
  return "cloud";
}
