import { useState } from "react";
import { motion } from "motion/react";
import { coachReview, copyReviewPrompt } from "../lib/api";
import type { Review } from "../types/coach";
import type { Task } from "../types/roadmap";
import { CopyToClaude } from "./CopyToClaude";
import { TaskItem } from "./TaskItem";
import { Thinking } from "./Thinking";

interface Props {
  hasApiKey: boolean;
  tasksById: Map<string, Task>;
  completed: Record<string, string>;
  onToggle: (task: Task) => void;
}

export function ReviewCard({ hasApiKey, tasksById, completed, onToggle }: Props) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runWithApi() {
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
      <h3 className="font-medium">Revisión de progreso</h3>
      <p className="text-sm text-muted">
        El coach mira tu roadmap, tus tareas y tu racha, y te dice cómo vas y qué hacer después.
      </p>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <CopyToClaude copyPrompt={copyReviewPrompt} />
        {hasApiKey && (
          <button
            type="button"
            onClick={runWithApi}
            disabled={loading}
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent disabled:opacity-50"
          >
            Preguntar aquí (API)
          </button>
        )}
      </div>

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
