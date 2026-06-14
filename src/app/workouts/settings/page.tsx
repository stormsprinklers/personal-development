import { redirect } from "next/navigation";

export default function WorkoutSettingsRedirectPage() {
  redirect("/health/workouts/settings");
}
