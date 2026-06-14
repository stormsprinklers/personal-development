import { redirect } from "next/navigation";

type Props = { params: Promise<{ routineId: string }> };

export default async function WorkoutRoutineRedirectPage({ params }: Props) {
  const { routineId } = await params;
  redirect(`/health/workouts/routines/${routineId}`);
}
