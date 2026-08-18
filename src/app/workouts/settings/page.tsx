import { redirect } from "next/navigation";

export default function WorkoutSettingsRedirectPage() {
  redirect("/settings?tab=health");
}
