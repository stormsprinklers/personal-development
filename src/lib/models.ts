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
  bodyWeight?: number;
  notes?: string;
  strengthSets: StrengthSet[];
  cardioEntries: CardioEntry[];
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
};

export type TodoItem = {
  id: string;
  listId: string;
  title: string;
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

export type AppData = {
  userProfile: UserProfile;
  exercises: Exercise[];
  workoutSessions: WorkoutSession[];
  habits: Habit[];
  habitLogs: HabitLog[];
  todoLists: TodoList[];
  todoItems: TodoItem[];
  todoCompletions: TodoCompletion[];
  goalSections: GoalSection[];
  goals: Goal[];
  goalNotes: GoalNote[];
  journalEntries: JournalEntry[];
  aiInsights: AiInsight[];
};
