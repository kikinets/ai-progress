import { motion } from "motion/react";
import type { Task, TaskType } from "../types/roadmap";

const TYPE_LABEL: Record<TaskType, string> = {
  concept: "Concepto",
  practice: "Práctica",
  deliverable: "Entregable",
};

interface Props {
  task: Task;
  done: boolean;
  onToggle: (task: Task) => void;
}

export function TaskItem({ task, done, onToggle }: Props) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        onClick={() => onToggle(task)}
        className="group flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span
          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border-2 transition-colors duration-150 ${
            done ? "border-accent bg-accent" : "border-muted group-hover:border-accent"
          }`}
        >
          <svg viewBox="0 0 16 16" className="size-3.5 text-surface" aria-hidden>
            <motion.path
              d="M3.5 8.5l3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </svg>
        </span>

        <span
          className={`flex-1 text-sm transition-colors duration-200 ${
            done ? "text-muted line-through" : ""
          } ${task.type === "deliverable" ? "font-medium" : ""}`}
        >
          {task.title}
        </span>

        <span className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px] text-muted">
          {TYPE_LABEL[task.type]}
        </span>
      </button>
    </li>
  );
}
