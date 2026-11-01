import { useEffect, useMemo, useState } from "react";
import { apiKeyStatus, deleteApiKey } from "../lib/api";
import type { ApiKeyStatus } from "../types/coach";
import type { Roadmap, Task } from "../types/roadmap";
import { ApiKeyForm } from "./ApiKeyForm";
import { QuizCard } from "./QuizCard";
import { ReviewCard } from "./ReviewCard";

interface Props {
  roadmap: Roadmap;
  completed: Record<string, string>;
  onToggle: (task: Task) => void;
}

export function CoachView({ roadmap, completed, onToggle }: Props) {
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => apiKeyStatus().then(setStatus).catch((e) => setError(String(e)));
  useEffect(() => {
    refresh();
  }, []);

  const tasksById = useMemo(
    () => new Map(roadmap.phases.flatMap((p) => p.weeks.flatMap((w) => w.tasks)).map((t) => [t.id, t])),
    [roadmap],
  );

  async function removeKey() {
    try {
      await deleteApiKey();
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {error}
      </p>
    );
  }
  if (!status) return null;
  if (!status.source) return <ApiKeyForm onSaved={refresh} />;

  return (
    <>
      <ReviewCard tasksById={tasksById} completed={completed} onToggle={onToggle} />
      <QuizCard skills={roadmap.skills} />

      <p className="mt-4 text-xs text-muted">
        {status.source === "env" ? (
          "Usando la clave de la variable de entorno ANTHROPIC_API_KEY."
        ) : (
          <>
            Clave guardada en el Administrador de credenciales de Windows.{" "}
            <button type="button" onClick={removeKey} className="underline underline-offset-2 hover:text-ink">
              Borrar clave
            </button>
          </>
        )}{" "}
        Cada consulta al coach tiene un pequeño coste en tu cuenta de Anthropic.
      </p>
    </>
  );
}
