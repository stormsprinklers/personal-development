export const DASHBOARD_SECTION_IDS = [
  "tasks",
  "goals",
  "summary",
  "journal",
  "accountability",
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

export const DEFAULT_DASHBOARD_SECTION_ORDER: DashboardSectionId[] = [...DASHBOARD_SECTION_IDS];

const VALID_SECTION_IDS = new Set<string>(DASHBOARD_SECTION_IDS);

export function isDashboardSectionId(value: string): value is DashboardSectionId {
  return VALID_SECTION_IDS.has(value);
}

export function resolveDashboardSectionOrder(order: string[] | undefined): DashboardSectionId[] {
  const picked = (order ?? []).filter(isDashboardSectionId);
  const missing = DEFAULT_DASHBOARD_SECTION_ORDER.filter((id) => !picked.includes(id));
  return [...picked, ...missing];
}

export function moveDashboardSection(
  order: DashboardSectionId[],
  sectionId: DashboardSectionId,
  direction: "up" | "down",
): DashboardSectionId[] {
  const index = order.indexOf(sectionId);
  if (index === -1) return order;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function sanitizeDashboardSectionOrder(order: string[] | undefined): DashboardSectionId[] | undefined {
  const resolved = resolveDashboardSectionOrder(order);
  if (!order?.length) return undefined;
  const sameAsDefault =
    resolved.length === DEFAULT_DASHBOARD_SECTION_ORDER.length &&
    resolved.every((id, i) => id === DEFAULT_DASHBOARD_SECTION_ORDER[i]);
  return sameAsDefault ? undefined : resolved;
}
