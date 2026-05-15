export type CardioType = "run" | "bike" | "swim";

export type ExerciseCategory = "strength" | CardioType;

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  archived: boolean;
  createdAt: string;
};

export type StrengthSet = {
  id: string;
  exerciseId: string;
  reps: number;
  weight: number;
};

export type CardioEntry = {
  id: string;
  type: CardioType;
  timeMinutes: number;
  distance?: number;
  incline?: number;
  laps?: number;
};

export type WorkoutSession = {
  id: string;
  date: string;
  /** When set, this session was logged under that workout routine (used for “last time” hints). */
  routineId?: string;
  bodyWeight?: number;
  notes?: string;
  strengthSets: StrengthSet[];
  cardioEntries: CardioEntry[];
};

/** User-defined workout split: strength exercise ids + which cardio blocks to show. */
export type WorkoutRoutine = {
  id: string;
  name: string;
  strengthExerciseIds: string[];
  cardioTypes: CardioType[];
  sortOrder: number;
  createdAt: string;
};

export type HabitType = "build" | "break";

export type Habit = {
  id: string;
  name: string;
  type: HabitType;
  active: boolean;
  createdAt: string;
};

export type HabitLog = {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  notes?: string;
};

export type TodoList = {
  id: string;
  name: string;
  area: string;
  createdAt: string;
  /** Exactly one list should be main; it never links to a goal. */
  isMain?: boolean;
  /** When set, this entire list belongs to that goal (tasks do not use item.goalId). */
  goalId?: string;
};

/** Headings within a list (used on the main list for multiple sections). */
export type TodoSection = {
  id: string;
  listId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type TodoItem = {
  id: string;
  listId: string;
  title: string;
  goalId?: string;
  /** Optional section within this list (see `TodoSection`). */
  sectionId?: string;
  active: boolean;
  createdAt: string;
};

export type TodoCompletion = {
  id: string;
  todoItemId: string;
  completedAt: string;
};

export type GoalSection = {
  id: string;
  name: string;
};

export type Goal = {
  id: string;
  sectionId: string;
  title: string;
  year: number;
  linkedHabitIds?: string[];
  habitTargetDays?: number;
  linkedExerciseId?: string;
  exerciseStartValue?: number;
  exerciseTargetValue?: number;
  /** Progress from start → target using the latest body weight logged this year on workouts. */
  bodyWeightStart?: number;
  bodyWeightTarget?: number;
  completed: boolean;
  createdAt: string;
};

export type GoalNote = {
  id: string;
  goalId: string;
  content: string;
  createdAt: string;
};

export type JournalEntry = {
  id: string;
  date: string;
  content: string;
  goalIds: string[];
};

export type AiInsightType = "daily_summary" | "journal_analysis" | "qa";

export type AiInsight = {
  id: string;
  type: AiInsightType;
  date: string;
  prompt: string;
  output: string;
};

export type UserProfile = {
  name: string;
  timezone: string;
};

/** Stored values match the user’s chosen units (no conversion in the app). */
export type WeightUnit = "lb" | "kg";

/** Run and bike distance entries use this unit. */
export type RunBikeDistanceUnit = "mi" | "km" | "yd";

export type MeasurementPreferences = {
  weightUnit: WeightUnit;
  runBikeDistanceUnit: RunBikeDistanceUnit;
};

export type AppData = {
  userProfile: UserProfile;
  measurementPreferences?: MeasurementPreferences;
  exercises: Exercise[];
  /** Workout templates (e.g. Leg Day); strength ids reference `exercises`. */
  workoutRoutines: WorkoutRoutine[];
  workoutSessions: WorkoutSession[];
  habits: Habit[];
  habitLogs: HabitLog[];
  todoLists: TodoList[];
  /** Headings for tasks on a list (intended for the main list). */
  todoSections: TodoSection[];
  todoItems: TodoItem[];
  todoCompletions: TodoCompletion[];
  /** Which lists feed the dashboard “Today” todo list; defaults to main only when unset/empty. */
  dashboardTodoListIds?: string[];
  goalSections: GoalSection[];
  goals: Goal[];
  goalNotes: GoalNote[];
  journalEntries: JournalEntry[];
  aiInsights: AiInsight[];
};
