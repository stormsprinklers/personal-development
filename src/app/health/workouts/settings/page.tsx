import { redirect } from "next/navigation";

/** Workout settings live under Settings → Health. */
export default function WorkoutSettingsPage() {
  redirect("/settings?tab=health");
}
