import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { setApiKey } from "../lib/api";

const KEYS_URL = "https://console.anthropic.com/settings/keys";

export function ApiKeyForm({ onSaved }: { onSaved: () => void }) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await setApiKey(key);
      setKey("");
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-lg border border-line p-4">
      <h3 className="font-medium">Respuestas dentro de la app</h3>
      <p className="mt-1 text-sm text-muted">
        Con una clave de la API de Claude, el coach responde aquí mismo y puedes marcar sus tareas y hacer el examen en la
        app. La API se paga aparte de tu suscripción: unos céntimos por consulta. Crea una clave en la{" "}
        <button type="button" onClick={() => openUrl(KEYS_URL)} className="text-accent underline-offset-2 hover:underline">
          consola de Anthropic
        </button>{" "}
        y pégala aquí. Se guarda en el Administrador de credenciales de Windows, no en ningún archivo.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.currentTarget.value)}
          placeholder="sk-ant-…"
          aria-label="Clave de API de Anthropic"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={saving || key.trim() === ""}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-surface disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
