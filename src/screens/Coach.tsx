import { useEffect, useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { ApiKeyForm } from "../components/ApiKeyForm";
import { QuizCard } from "../components/QuizCard";
import { ReviewCard } from "../components/ReviewCard";
import { Screen, ScreenHeader } from "../components/ui";
import { useStore } from "../app/store";
import { apiKeyStatus, deleteApiKey } from "../lib/api";
import type { ApiKeyStatus } from "../types/coach";

export function Coach() {
  const { roadmap } = useStore();
  const [status, setStatus] = useState<ApiKeyStatus>({ source: null });
  const [error, setError] = useState<string | null>(null);

  const refresh = () => apiKeyStatus().then(setStatus).catch((e) => setError(String(e)));
  useEffect(() => {
    refresh();
  }, []);

  const hasApiKey = status.source !== null;

  return (
    <Screen>
      <ScreenHeader title="Coach" subtitle="Revisa tu progreso y ponte a prueba con Claude." />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/5 p-4">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
        <p className="text-sm leading-relaxed text-muted">
          <span className="font-medium text-ink">Es gratis.</span> La app prepara un mensaje con tu progreso, lo copia y abre claude.ai. Lo pegas en un chat
          nuevo y responde tu suscripción de Claude.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ReviewCard hasApiKey={hasApiKey} />
        <QuizCard hasApiKey={hasApiKey} skills={roadmap.skills} />
      </div>

      {/* Optional paid mode: answers inside the app through the Anthropic API. */}
      <details className="group mt-6 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-muted hover:text-ink">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          Opcional: usar la API de Anthropic (de pago)
        </summary>
        <div className="mt-3">
          {error && <p role="alert" className="mb-3 text-danger">{error}</p>}
          {!hasApiKey ? (
            <ApiKeyForm onSaved={refresh} />
          ) : status.source === "env" ? (
            <p className="text-muted">Usando la clave de la variable de entorno ANTHROPIC_API_KEY.</p>
          ) : (
            <p className="text-muted">
              Clave guardada en el Administrador de credenciales de Windows.{" "}
              <button type="button" onClick={() => deleteApiKey().then(refresh).catch((e) => setError(String(e)))} className="underline underline-offset-2 hover:text-ink">
                Borrar clave
              </button>
            </p>
          )}
        </div>
      </details>
    </Screen>
  );
}
