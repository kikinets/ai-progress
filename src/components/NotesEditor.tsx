import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { useStore } from "../app/store";

const SAVE_DELAY_MS = 600;
type Status = "idle" | "saving" | "saved" | "error";

/** Markdown notes that save themselves shortly after you stop typing, and on close. */
export function NotesEditor({ taskId, initial }: { taskId: string; initial: string }) {
  const { actions } = useStore();
  const [text, setText] = useState(initial);
  const [tab, setTab] = useState<"write" | "preview">(initial ? "preview" : "write");
  const [status, setStatus] = useState<Status>("idle");
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(actions.saveNotes);
  saveRef.current = actions.saveNotes;

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    setStatus("saving");
    setStatus((await saveRef.current(taskId, value)) ? "saved" : "error");
  };

  // Save whatever is pending when the drawer closes or switches task.
  useEffect(
    () => () => {
      if (pending.current !== null) {
        if (timer.current) clearTimeout(timer.current);
        void saveRef.current(taskId, pending.current);
      }
    },
    [taskId],
  );

  const onChange = (value: string) => {
    setText(value);
    pending.current = value;
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
      <div className="flex items-center justify-between border-b border-line px-2 py-1.5">
        <div className="flex gap-1 text-xs">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-2.5 py-1 transition-colors ${tab === t ? "bg-surface-3 text-ink" : "text-muted hover:text-ink"}`}
            >
              {t === "write" ? "Escribir" : "Vista previa"}
            </button>
          ))}
        </div>
        <span className="px-2 text-[11px] text-faint" aria-live="polite">
          {status === "saving" && "Guardando…"}
          {status === "saved" && "Guardado"}
          {status === "error" && (
            <button className="text-danger underline" onClick={() => ((pending.current = text), flush())}>
              No se pudo guardar · Reintentar
            </button>
          )}
        </span>
      </div>
      {tab === "write" ? (
        <textarea
          value={text}
          onChange={(e) => onChange(e.currentTarget.value)}
          onBlur={flush}
          placeholder="Apuntes, dudas, enlaces… (Markdown)"
          aria-label="Notas de la tarea"
          className="block min-h-40 w-full resize-y bg-transparent p-3 font-mono text-[13px] leading-relaxed outline-none placeholder:text-faint"
        />
      ) : (
        <div className="prose-notes min-h-40 p-3 text-sm leading-relaxed">
          {text.trim() ? <Markdown>{text}</Markdown> : <p className="text-faint">Todavía no hay notas.</p>}
        </div>
      )}
    </div>
  );
}
