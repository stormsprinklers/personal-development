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
    href: "/workouts",
    title: "Workouts",
    description: "Log strength and cardio sessions with progression metrics.",
  },
  {
    href: "/todos",
    title: "To-Do Lists",
    shortTitle: "Tasks",
    description: "Manage area-based lists with hidden completions and history.",
  },
  {
    href: "/goals",
    title: "Goals",
    description: "Organize annual goals into sections with notes and status.",
  },
];
