export type AppSection = {
  href: string;
  title: string;
  shortTitle?: string;
  description: string;
};

export const APP_SECTIONS: AppSection[] = [
  {
    href: "/",
    title: "Dashboard",
    shortTitle: "Home",
    description: "View progress trends, insights, and your daily AI summary.",
  },
  {
    href: "/workouts",
    title: "Workouts",
    description: "Log strength and cardio sessions with progression metrics.",
  },
  {
    href: "/goals",
    title: "Goals",
    description: "Organize annual goals into sections with notes and status.",
  },
  {
    href: "/journal",
    title: "Journal",
    description: "Capture reflections, link entries to goals, and ask AI questions.",
  },
  {
    href: "/habits",
    title: "Habits",
    description: "Track daily habits with check-ins and history.",
  },
  {
    href: "/todos",
    title: "To-Do Lists",
    shortTitle: "Tasks",
    description: "Manage area-based lists with hidden completions and history.",
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Cloud sync, accountability partners, and app preferences.",
  },
];

export function isAppSectionActive(section: AppSection, pathname: string): boolean {
  if (section.href === "/") return pathname === "/";
  if (section.href === "/workouts") return pathname.startsWith("/workouts");
  if (section.href === "/settings") return pathname.startsWith("/settings");
  return pathname === section.href || pathname.startsWith(`${section.href}/`);
}

export function appSectionIndex(pathname: string): number | null {
  const index = APP_SECTIONS.findIndex((section) => isAppSectionActive(section, pathname));
  return index === -1 ? null : index;
}

export function adjacentAppSectionHref(pathname: string, direction: "next" | "prev"): string | null {
  const index = appSectionIndex(pathname);
  if (index === null) return null;
  const nextIndex = direction === "next" ? index + 1 : index - 1;
  if (nextIndex < 0 || nextIndex >= APP_SECTIONS.length) return null;
  return APP_SECTIONS[nextIndex].href;
}

export function tabTransitionDirection(fromPathname: string, toHref: string): "next" | "prev" | null {
  const fromIndex = appSectionIndex(fromPathname);
  const toIndex = APP_SECTIONS.findIndex((section) => section.href === toHref);
  if (fromIndex === null || toIndex === -1 || fromIndex === toIndex) return null;
  return toIndex > fromIndex ? "next" : "prev";
}

export const TAB_SWIPE_ENTER_KEY = "pd-tab-swipe-enter";
