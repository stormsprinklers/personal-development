import { redirect } from "next/navigation";

/** Food tracking is deprecated — redirect to workouts. */
export default function FoodPage() {
  redirect("/health/workouts");
}
