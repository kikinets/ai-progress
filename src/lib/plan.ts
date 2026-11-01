// Lookups over the roadmap that several screens need.
import type { ProgressView, TaskProgress } from "../types/progress";
import type { Day, Roadmap, Task, Week } from "../types/roadmap";

export interface PlacedTask {
  task: Task;
  day: Day;
  week: Week;
}

export function placedTasks(roadmap: Roadmap): PlacedTask[] {
  return roadmap.phases.flatMap((p) => p.weeks.flatMap((week) => week.days.flatMap((day) => day.tasks.map((task) => ({ task, day, week })))));
}

export const isDone = (view: ProgressView, taskId: string) => Boolean(view.tasks[taskId]?.completedAt);

export const subtasksDone = (task: Task, progress: TaskProgress | undefined) =>
  task.subtasks.filter((s) => progress?.subtasks[s.id]).length;

/** Today's tasks, plus pending ones from earlier days marked as overdue. */
export function tasksForToday(roadmap: Roadmap, view: ProgressView, today: string) {
  return placedTasks(roadmap)
    .filter(({ task, day }) => day.date === today || (day.date < today && !isDone(view, task.id)))
    .map((p) => ({ ...p, overdue: p.day.date < today }));
}

export function currentWeek(roadmap: Roadmap, today: string): Week | undefined {
  return roadmap.phases.flatMap((p) => p.weeks).find((w) => w.start <= today && today <= w.end);
}

export function weekProgress(week: Week, view: ProgressView) {
  const tasks = week.days.flatMap((d) => d.tasks);
  return {
    done: tasks.filter((t) => isDone(view, t.id)).length,
    total: tasks.length,
    estimate: tasks.reduce((sum, t) => sum + t.estimateMinutes, 0),
    studied: tasks.reduce((sum, t) => sum + (view.stats.minutesByTask[t.id] ?? 0), 0),
  };
}

/** The next deliverable that is not done yet. */
export function nextDeliverable(roadmap: Roadmap, view: ProgressView): PlacedTask | undefined {
  return placedTasks(roadmap).find(({ task }) => task.type === "deliverable" && !isDone(view, task.id));
}
