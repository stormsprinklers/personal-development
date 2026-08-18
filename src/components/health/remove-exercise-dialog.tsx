"use client";

import { GlassButton } from "@/components/ui/glass-button";
import { Sheet } from "@/components/ui/sheet";

type Props = {
  open: boolean;
  exerciseName: string;
  onClose: () => void;
  onThisWorkout: () => void;
  onThisAndFuture: () => void;
};

export function RemoveExerciseDialog({
  open,
  exerciseName,
  onClose,
  onThisWorkout,
  onThisAndFuture,
}: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Remove exercise?" compact>
      <p className="text-sm leading-relaxed text-slate">
        Do you want to remove &ldquo;{exerciseName}&rdquo; from this workout, or from future workouts as well?
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate/95">
        Logged sets for this exercise stay in your history.
      </p>
      <div className="mt-4 grid gap-2">
        <GlassButton variant="secondary" onClick={onThisWorkout}>
          This workout only
        </GlassButton>
        <GlassButton variant="secondary" onClick={onThisAndFuture}>
          This and future workouts
        </GlassButton>
        <GlassButton variant="primary" onClick={onClose}>
          Cancel
        </GlassButton>
      </div>
    </Sheet>
  );
}
