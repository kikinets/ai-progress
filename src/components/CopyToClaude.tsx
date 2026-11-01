import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { openUrl } from "@tauri-apps/plugin-opener";

const CLAUDE_URL = "https://claude.ai/new";

interface Props {
  /** Asks Rust to put the prompt on the clipboard. */
  copyPrompt: () => Promise<void>;
}

/** Free coach mode: copies the prompt and opens claude.ai, where the user's subscription answers it. */
export function CopyToClaude({ copyPrompt }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await copyPrompt();
      setState("copied");
      setError(null);
      openUrl(CLAUDE_URL).catch(() => {}); // Copying is what matters; the user can open claude.ai themselves.
    } catch (e) {
      setState("error");
      setError(String(e));
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copy}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-surface"
      >
        Copiar para Claude.ai
      </button>
      <AnimatePresence>
        {state === "copied" && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-sm text-muted"
          >
            <span className="font-medium text-accent">Copiado.</span> Pégalo (Ctrl+V) en el chat de claude.ai que se
            ha abierto en tu navegador.
          </motion.p>
        )}
      </AnimatePresence>
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
