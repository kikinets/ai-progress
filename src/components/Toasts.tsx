import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Info, Sparkles } from "lucide-react";

type Kind = "info" | "error" | "celebrate";
interface ToastItem {
  id: number;
  kind: Kind;
  title: string;
  body?: string;
}

// A tiny global store, so any module can raise a toast without prop drilling.
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<(items: ToastItem[]) => void>();
const emit = () => listeners.forEach((l) => l(items));

export function toast(kind: Kind, title: string, body?: string) {
  const item = { id: nextId++, kind, title, body };
  items = [...items, item].slice(-4);
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== item.id);
    emit();
  }, kind === "error" ? 7000 : 4500);
}

const ICONS: Record<Kind, ReactNode> = {
  info: <Info className="size-4 text-accent" />,
  error: <CircleAlert className="size-4 text-danger" />,
  celebrate: <Sparkles className="size-4 text-accent" />,
};

export function Toasts() {
  const [list, setList] = useState(items);
  useEffect(() => {
    listeners.add(setList);
    return () => void listeners.delete(setList);
  }, []);

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-[70] flex w-80 flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: "spring", visualDuration: 0.3, bounce: 0.2 }}
            role={t.kind === "error" ? "alert" : "status"}
            className={`surface pointer-events-auto flex gap-3 rounded-xl p-3.5 ${t.kind === "celebrate" ? "border-accent/40" : ""}`}
          >
            <span className="mt-0.5">{ICONS[t.kind]}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t.title}</p>
              {t.body && <p className="mt-0.5 text-xs text-muted">{t.body}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
