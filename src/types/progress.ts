// Shapes returned by the progress commands (progress/mod.rs). Timestamps are ISO strings in UTC.

export type TimerMode = "pomodoro" | "free";

export interface TaskProgress {
  completedAt: string | null;
  /** Subtask id -> when it was completed. */
  subtasks: Record<string, string>;
  notes: string;
}

export interface ActiveSession {
  taskId: string;
  mode: TimerMode;
  startedAt: string;
  segmentStart: string | null;
  accumulatedSeconds: number;
  paused: boolean;
}

export interface Streak {
  current: number;
  longest: number;
  studiedToday: boolean;
}

export interface DayStat {
  date: string;
  minutes: number;
  tasksDone: number;
}

export interface Stats {
  todayMinutes: number;
  weekMinutes: number;
  weekTargetMinutes: number;
  totalMinutes: number;
  /** 84 days ending today, oldest first. */
  minutesByDay: DayStat[];
  minutesByTask: Record<string, number>;
}

export interface XpView {
  total: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export interface BadgeView {
  id: string;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export interface ProgressView {
  tasks: Record<string, TaskProgress>;
  activeSession: ActiveSession | null;
  activeElapsedSeconds: number;
  notice: string | null;
  streak: Streak;
  stats: Stats;
  xp: XpView;
  badges: BadgeView[];
}

export interface ProgressUpdate {
  view: ProgressView;
  newBadges: string[];
  levelUp: number | null;
}
