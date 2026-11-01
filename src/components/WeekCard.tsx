import { AnimatePresence, motion } from "motion/react";
import { formatRange } from "../lib/dates";
import type { Task, Week } from "../types/roadmap";
import { ProgressBar } from "./ProgressBar";
import { TaskItem } from "./TaskItem";

interface Props {
  week: Week;
  isCurrent: boolean;
  completed: Record<string, string>;
  onToggle: (task: Task) => void;
}

export function WeekCard({ week, isCurrent, completed, onToggle }: Props) {
  const doneCount = week.tasks.filter((t) => completed[t.id]).length;
  const isComplete = week.tasks.length > 0 && doneCount === week.tasks.length;

  return (
    <article
      className={`mt-4 rounded-lg border p-4 ${isCurrent ? "border-accent" : "border-line"}`}
      aria-current={isCurrent ? "date" : undefined}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">
            Semana {week.number}: {week.title}
          </h3>
          <p className="text-xs text-muted">
            {formatRange(week.start, week.end)}
            {isCurrent && <span className="ml-2 font-medium text-accent">Esta semana</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence>
            {isComplete && (
              <motion.span
                className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-surface"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", visualDuration: 0.25, bounce: 0.4 }}
              >
                Completada
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-sm tabular-nums text-muted">
            {doneCount}/{week.tasks.length}
          </span>
        </div>
      </header>

      <ProgressBar
        value={doneCount}
        max={week.tasks.length}
        label={`Progreso de la semana ${week.number}`}
        className="mt-3"
      />

      <ul className="mt-3 space-y-0.5">
        {week.tasks.map((task) => (
          <TaskItem key={task.id} task={task} done={Boolean(completed[task.id])} onToggle={onToggle} />
        ))}
      </ul>
    </article>
  );
}
