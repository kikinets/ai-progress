import { useState } from "react";
import { motion } from "motion/react";
import { coachReview, copyReviewPrompt } from "../lib/api";
import type { Review } from "../types/coach";
import { CopyToClaude } from "./CopyToClaude";
import { TaskRow } from "./TaskRow";
import { useStore } from "../app/store";
import { Thinking } from "./Thinking";

interface Props {
  hasApiKey: boolean;
}

export function ReviewCard({ hasApiKey }: Props) {
  const { taskById } = useStore();
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

  const nextTasks = review?.nextTaskIds.map((id) => taskById.get(id)).filter((t) => t !== undefined) ?? [];

  return (
    <section className="surface rounded-2xl p-5">
      <h3 className="text-lg font-semibold">Revisión de progreso</h3>
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
            className="rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm hover:border-line-strong disabled:opacity-50"
          >
            Preguntar aquí (API)
          </button>
        )}
      </div>

      {loading && <Thinking label="El coach está revisando tu progreso…" />}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
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
              <ul className="-mx-2 mt-1 space-y-0.5">
                {nextTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            </>
          )}
        </motion.div>
      )}
    </section>
  );
}
