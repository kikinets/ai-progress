import { motion } from "motion/react";
import { Clock, ListChecks, Play } from "lucide-react";
import { useStore } from "../app/store";
import { formatMinutes } from "../lib/format";
import { subtasksDone } from "../lib/plan";
import type { Task, TaskType } from "../types/roadmap";
import { Checkbox, Pill } from "./ui";

export const TYPE_LABEL: Record<TaskType, string> = {
  concept: "Concepto",
  practice: "Práctica",
  deliverable: "Entregable",
  review: "Repaso",
};

export function TaskRow({ task, overdue = false, showStudy = true }: { task: Task; overdue?: boolean; showStudy?: boolean }) {
  const { view, actions, openTask } = useStore();
  const progress = view.tasks[task.id];
  const done = Boolean(progress?.completedAt);
  const subDone = subtasksDone(task, progress);
  const studying = view.activeSession?.taskId === task.id;

  return (
    <motion.li layout="position" className="list-none">
      <div
        role="button"
        tabIndex={0}
        onClick={() => openTask(task.id)}
        onKeyDown={(e) => e.key === "Enter" && openTask(task.id)}
        className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-150 ${
          studying ? "border-accent/40 bg-accent/5" : "border-transparent hover:border-line hover:bg-surface-2"
        }`}
      >
        <Checkbox checked={done} onChange={() => actions.setTaskDone(task.id, !done)} label={`Completar: ${task.title}`} />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm transition-colors duration-200 ${done ? "text-faint line-through" : ""} ${task.type === "deliverable" ? "font-medium" : ""}`}>
            {task.title}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
            <Pill tone={task.type === "deliverable" ? "accent" : "neutral"}>{TYPE_LABEL[task.type]}</Pill>
            {overdue && !done && <Pill tone="warning">Atrasada</Pill>}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatMinutes(task.estimateMinutes)}
            </span>
            {task.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <ListChecks className="size-3" />
                {subDone}/{task.subtasks.length}
              </span>
            )}
          </div>
        </div>
        {showStudy && !done && !view.activeSession && (
          <button
            type="button"
            title="Estudiar ahora"
            aria-label={`Estudiar ahora: ${task.title}`}
            onClick={(e) => {
              e.stopPropagation();
              actions.startSession(task.id, "pomodoro");
            }}
            className="grid size-8 place-items-center rounded-lg text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-surface-3 hover:text-ink focus-visible:opacity-100"
          >
            <Play className="size-4" />
          </button>
        )}
      </div>
    </motion.li>
  );
}
