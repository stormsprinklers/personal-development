/** Progress from `start` → `target` given `current` (supports increase or decrease). */
export function progressBetweenValues(start: number, target: number, current: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(target) || !Number.isFinite(current)) return 0;
  if (target === start) return Math.abs(current - target) < 1e-6 ? 100 : 0;
  if (target > start) {
    return Math.min(100, Math.max(0, ((current - start) / (target - start)) * 100));
  }
  return Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100));
}

export function manualGoalProgressPercent(
  current: number,
  target: number,
  start?: number,
): number | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return undefined;
  const baseline = typeof start === "number" && Number.isFinite(start) ? start : 0;
  return progressBetweenValues(baseline, target, current);
}
