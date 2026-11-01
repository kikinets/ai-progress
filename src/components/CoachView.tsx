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
  const [status, setStatus] = useState<ApiKeyStatus>({ source: null });
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

  const hasApiKey = status.source !== null;

  return (
    <>
      <p className="mb-4 text-sm text-muted">
        El coach es gratis: copia tu progreso al portapapeles, abre claude.ai y lo pegas en un chat nuevo. Responde tu
        suscripción de Claude.
      </p>

      <ReviewCard hasApiKey={hasApiKey} tasksById={tasksById} completed={completed} onToggle={onToggle} />
      <QuizCard hasApiKey={hasApiKey} skills={roadmap.skills} />

      {/* Optional paid mode: answers inside the app through the Anthropic API. */}
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Opcional: usar la API de Anthropic (de pago)</summary>
        <div className="mt-3">
          {error && (
            <p role="alert" className="mb-3 text-red-600">
              {error}
            </p>
          )}
          {!hasApiKey ? (
            <ApiKeyForm onSaved={refresh} />
          ) : status.source === "env" ? (
            <p className="text-muted">Usando la clave de la variable de entorno ANTHROPIC_API_KEY.</p>
          ) : (
            <p className="text-muted">
              Clave guardada en el Administrador de credenciales de Windows.{" "}
              <button type="button" onClick={removeKey} className="underline underline-offset-2 hover:text-ink">
                Borrar clave
              </button>
            </p>
          )}
        </div>
      </details>
    </>
  );
}
