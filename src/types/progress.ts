// Shape of the progress returned by the `load_progress` and `set_task_done` Tauri commands.

export interface Streak {
  current: number;
  longest: number;
  studiedToday: boolean;
}

export interface Progress {
  /** Task id -> ISO timestamp (UTC) of when it was completed. */
  completed: Record<string, string>;
  streak: Streak;
}
