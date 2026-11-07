export const TOPIC_TASK_GOAL = 20;
export const TOPIC_ACCURACY_GOAL = 80;

export const topicIds = [
  "natural-4", "multiply-4", "divide-4", "order-4", "units-4", "equations-4", "missing-4", "word-problems-4",
  "decimal-add-5", "decimal-multiply-5", "fractions-5", "mixed-5", "percent-5", "order-5", "averages-5", "fraction-of-number-5",
  "negative-add-6", "negative-multiply-6", "fractions-6", "proportions-6", "expressions-6", "order-6", "absolute-6", "percent-problems-6",
  "powers-7", "power-properties-7", "expressions-7", "linear-7", "formulas-7", "order-7", "identities-7", "power-combinations-7",
  "roots-8", "root-operations-8", "integer-powers-8", "rational-8", "quadratic-8", "order-8", "vieta-8", "rational-equations-8",
  "scientific-9", "radicals-9", "progressions-9", "functions-9", "trig-9", "order-9", "progression-sums-9", "probability-9",
] as const;

export type TopicId = (typeof topicIds)[number];
export type Difficulty = "easy" | "medium" | "hard";

export interface TopicProgress {
  solved: number;
  attempts: number;
  firstTry: number;
}

export interface ProgressState extends TopicProgress {
  streak: number;
  bestStreak: number;
  topics: Record<string, TopicProgress>;
  masteryTopics: Record<string, TopicProgress>;
}

export const emptyProgress: ProgressState = {
  solved: 0,
  attempts: 0,
  firstTry: 0,
  streak: 0,
  bestStreak: 0,
  topics: {},
  masteryTopics: {},
};

export function isMasteryComplete(progress: TopicProgress) {
  return progress.solved >= TOPIC_TASK_GOAL &&
    progress.attempts > 0 &&
    progress.firstTry * 100 >= TOPIC_ACCURACY_GOAL * progress.attempts;
}

export interface SparkEvent {
  kind: string;
  amount: number;
  note: string | null;
  createdAt: Date;
}

export interface CloudState {
  progress: ProgressState;
  plusBalance: number;
  sparkBalance: number;
  trophies: { gold: number; silver: number; bronze: number };
  sparkEvents: SparkEvent[];
  selectedTheme: string;
  purchasedThemeIds: string[];
  grade: number;
  migratedAt: Date | null;
  updatedAt: Date;
}

export interface AttemptResult {
  state: CloudState;
  awarded: boolean;
  duplicate: boolean;
}
