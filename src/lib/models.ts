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

/** Free-form note for one strength exercise on a session (shown next time you log this routine). */
export type StrengthExerciseNote = {
  exerciseId: string;
  note: string;
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
  /** Per-exercise notes for this session’s strength block. */
  strengthExerciseNotes?: StrengthExerciseNote[];
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
  archived: boolean;
};

export type Habit = {
  id: string;
  name: string;
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

export type GoalTrackingMode = "tasks" | "habits" | "exercise" | "body_weight" | "manual";

export type Goal = {
  id: string;
  sectionId: string;
  title: string;
  year: number;
  /** Explicit tracking metrics; inferred from legacy fields when omitted. */
  trackingModes?: GoalTrackingMode[];
  linkedHabitIds?: string[];
  habitTargetDays?: number;
  linkedExerciseId?: string;
  exerciseStartValue?: number;
  exerciseTargetValue?: number;
  /** Progress from start → target using the latest body weight logged this year on workouts. */
  bodyWeightStart?: number;
  bodyWeightTarget?: number;
  /** Optional manual tracker: current value toward `manualProgressTarget`. */
  manualProgressCurrent?: number;
  /** Target number for manual progress (e.g. books to read, amount to save). */
  manualProgressTarget?: number;
  /** Baseline for manual progress; defaults to 0 when omitted. */
  manualProgressStart?: number;
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
  /** Playback metadata; audio file expires after 7 days. */
  voiceMemo?: {
    id: string;
    expiresAt: string;
  };
};

export type AiInsightType = "daily_summary" | "journal_analysis" | "qa";

/** Follow-up turns after the opening daily coach note (same calendar day). */
export type CoachChatTurn = {
  role: "user" | "assistant";
  content: string;
  at: string;
};

export type AiInsight = {
  id: string;
  type: AiInsightType;
  date: string;
  prompt: string;
  output: string;
  coachChat?: CoachChatTurn[];
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

export type FoodSource = "custom" | "usda" | "openfoodfacts";

export type CuratedNutrientId =
  | "fiber_g"
  | "sodium_mg"
  | "sugar_g"
  | "saturated_fat_g"
  | "cholesterol_mg"
  | "calcium_mg"
  | "iron_mg"
  | "potassium_mg"
  | "vitamin_a_mcg"
  | "vitamin_c_mg"
  | "vitamin_d_mcg";

export type NutrientMap = Partial<Record<CuratedNutrientId, number>>;

export type FoodItem = {
  id: string;
  name: string;
  brand?: string;
  source: FoodSource;
  externalId?: string;
  servingLabel: string;
  servingGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  micronutrients?: NutrientMap;
  createdAt: string;
  archived?: boolean;
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  ingredients: { foodId: string; servings: number }[];
  createdAt: string;
};

export type SavedMeal = {
  id: string;
  name: string;
  items: { foodId?: string; recipeId?: string; servings: number }[];
  createdAt: string;
};

export type MealSlot = "breakfast" | "lunch" | "dinner";

export type FoodLogEntry = {
  id: string;
  date: string;
  meal: MealSlot;
  foodId?: string;
  recipeId?: string;
  servings: number;
  loggedAt: string;
};

export type NutritionGoals = {
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  micronutrients?: Partial<Record<CuratedNutrientId, number>>;
  enabledMicronutrients?: CuratedNutrientId[];
};

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export type HealthProfile = {
  sex: "male" | "female";
  birthYear?: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  macroSplitPct: { protein: number; carbs: number; fat: number };
};

/** Push / reminder preferences (sent via Web Push when installed as PWA). */
export type NotificationPrefs = {
  /** Master switch — must be on and browser permission granted. */
  enabled: boolean;
  habitReminders: boolean;
  /** Local hour 0–23 in app timezone (America/Phoenix). Default 20 (8pm). */
  habitReminderHour: number;
  /** AI one-liner grounded in goals and recent progress. */
  motivationalAi: boolean;
  /** Local hour for motivational push. Default 8 (morning). */
  motivationalHour: number;
  journalReminders: boolean;
  journalReminderHour: number;
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
  /** Display order for dashboard todos (subset of todo item ids). */
  dashboardTodoOrder?: string[];
  /** Display order for dashboard tasks & habits (`habit-{id}` / `todo-{id}` keys). */
  dashboardDailyOrder?: string[];
  /** Display order for dashboard sections (`tasks`, `goals`, `summary`, `journal`, `accountability`). */
  dashboardSectionOrder?: string[];
  goalSections: GoalSection[];
  goals: Goal[];
  goalNotes: GoalNote[];
  journalEntries: JournalEntry[];
  aiInsights: AiInsight[];
  foods: FoodItem[];
  recipes: Recipe[];
  savedMeals: SavedMeal[];
  foodLogEntries: FoodLogEntry[];
  nutritionGoals?: NutritionGoals;
  healthProfile?: HealthProfile;
  recentFoodIds?: string[];
  notificationPrefs?: NotificationPrefs;
};
