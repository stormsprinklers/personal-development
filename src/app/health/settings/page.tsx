import { redirect } from "next/navigation";

/** Health settings live under Settings → Health. */
export default function HealthSettingsPage() {
  redirect("/settings?tab=health");
}
