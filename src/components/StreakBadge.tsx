import { AnimatePresence, motion } from "motion/react";
import type { Streak } from "../types/progress";

const days = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

export function StreakBadge({ streak }: { streak: Streak }) {
  const hint =
    streak.current === 0
      ? "Completa una tarea hoy para empezar"
      : streak.studiedToday
        ? `Récord: ${days(streak.longest)}`
        : "Completa una tarea hoy para no perderla";

  return (
    <div className="text-right">
      <p className="text-xs text-muted">Racha</p>
      <p className="text-2xl font-semibold tabular-nums">
        {/* Keyed by value so a new day pops in and the old one leaves. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={streak.current}
            className={`inline-block ${streak.studiedToday ? "text-accent" : ""}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            {days(streak.current)}
          </motion.span>
        </AnimatePresence>
      </p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
