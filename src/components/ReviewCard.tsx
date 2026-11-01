import { useState } from "react";
import { motion } from "motion/react";
import { coachReview } from "../lib/api";
import type { Review } from "../types/coach";
import type { Task } from "../types/roadmap";
import { TaskItem } from "./TaskItem";
import { Thinking } from "./Thinking";

interface Props {
  tasksById: Map<string, Task>;
  completed: Record<string, string>;
  onToggle: (task: Task) => void;
}

export function ReviewCard({ tasksById, completed, onToggle }: Props) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setReview(await coachReview());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const nextTasks = review?.nextTaskIds.map((id) => tasksById.get(id)).filter((t) => t !== undefined) ?? [];

  return (
    <section className="rounded-lg border border-line p-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">Revisión de progreso</h3>
          <p className="text-sm text-muted">El coach mira tu roadmap, tus tareas y tu racha.</p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-surface disabled:opacity-50"
        >
          {review ? "Revisar de nuevo" : "Revisar mi progreso"}
        </button>
      </header>

      {loading && <Thinking label="El coach está revisando tu progreso…" />}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {review && !loading && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <p className="mt-4 text-sm">{review.summary}</p>
          <p className="mt-3 border-l-2 border-accent pl-3 text-sm">{review.advice}</p>
          {nextTasks.length > 0 && (
            <>
              <h4 className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">Siguientes tareas</h4>
              <ul className="mt-1 space-y-0.5">
                {nextTasks.map((task) => (
                  <TaskItem key={task.id} task={task} done={Boolean(completed[task.id])} onToggle={onToggle} />
                ))}
              </ul>
            </>
          )}
        </motion.div>
      )}
    </section>
  );
}
