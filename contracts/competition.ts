export const COMPETITION_MIN_PLAYERS = 3;
export const COMPETITION_MAX_PLAYERS = 8;
export const COMPETITION_TASK_COUNT = 10;
export const COMPETITION_DURATION_SEC = 90;
export const COMPETITION_COUNTDOWN_SEC = 4;
export const COMPETITION_SPARK_REWARDS = [5, 3, 2] as const;

export type CompetitionStatus = "lobby" | "active" | "finished";

export interface CompetitionTaskView {
  index: number;
  expression: string;
  answer: number | null;
}

export interface CompetitionPlayerView {
  userId: number;
  name: string;
  correct: number;
  answered: number;
  totalTimeMs: number;
  finished: boolean;
  place: number | null;
  sparks: number;
}

export interface CompetitionRoomView {
  id: string;
  code: string;
  hostUserId: number;
  grade: number;
  difficulty: "medium" | "hard";
  status: CompetitionStatus;
  taskCount: number;
  durationSec: number;
  startsAt: Date | null;
  endsAt: Date | null;
  serverNow: Date;
  tasks: CompetitionTaskView[];
  players: CompetitionPlayerView[];
  answeredTaskIndexes: number[];
}

export interface TrophyState {
  gold: number;
  silver: number;
  bronze: number;
}
