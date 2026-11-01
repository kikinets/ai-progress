import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Clock, Flag } from "lucide-react";
import { useStore } from "../app/store";
import { TaskRow } from "../components/TaskRow";
import { Card, Pill, ProgressBar, Ring, Screen, ScreenHeader } from "../components/ui";
import { shortDate, shortRange, todayIso, weekdayLong } from "../lib/dates";
import { formatMinutes } from "../lib/format";
import { isDone, placedTasks, weekProgress } from "../lib/plan";
import type { Task, Week } from "../types/roadmap";

type Filter = "all" | "pending" | "deliverables";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendientes" },
  { id: "deliverables", label: "Entregables" },
];

export function Plan() {
  const { roadmap, view } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const today = todayIso();
  const all = placedTasks(roadmap);
  const done = all.filter(({ task }) => isDone(view, task.id)).length;
  const weeks = roadmap.phases.flatMap((p) => p.weeks);
  const current = weeks.find((w) => w.start <= today && today <= w.end) ?? weeks.find((w) => w.start > today) ?? weeks[0];

  const keep = (t: Task) =>
    filter === "all" || (filter === "pending" ? !isDone(view, t.id) : t.type === "deliverable");

  return (
    <Screen>
      <ScreenHeader
        title="Plan de estudio"
        subtitle={roadmap.goal}
        aside={
          <Ring value={done} max={all.length} size={84} stroke={8} label="Progreso total">
            <span className="font-mono text-sm font-semibold tabular-nums">{Math.round((100 * done) / Math.max(1, all.length))}%</span>
          </Ring>
        }
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex rounded-xl bg-surface-2 p-1 text-sm" role="radiogroup" aria-label="Filtrar tareas">
          {FILTERS.map((f) => (
            <button key={f.id} role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)} className={`relative rounded-lg px-3 py-1.5 transition-colors ${filter === f.id ? "text-ink" : "text-muted hover:text-ink"}`}>
              {filter === f.id && <motion.span layoutId="plan-filter" className="absolute inset-0 rounded-lg bg-surface-3" transition={{ duration: 0.2 }} />}
              <span className="relative">{f.label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted tabular-nums">
          {done} de {all.length} tareas
        </p>
      </div>

      <div className="relative space-y-4 pl-6">
        <div className="absolute top-3 bottom-3 left-[7px] w-px bg-line" aria-hidden />
        {weeks.map((week) => (
          <WeekBlock key={week.id} week={week} defaultOpen={week.id === current?.id} isCurrent={week.id === current?.id} keep={keep} />
        ))}
        {roadmap.phases
          .filter((p) => p.weeks.length === 0)
          .map((p) => (
            <Card key={p.id} className="border-dashed">
              <p className="font-medium">{p.name}</p>
              {p.note && <p className="mt-1 text-sm text-muted">{p.note}</p>}
            </Card>
          ))}
      </div>
    </Screen>
  );
}

function WeekBlock({ week, defaultOpen, isCurrent, keep }: { week: Week; defaultOpen: boolean; isCurrent: boolean; keep: (t: Task) => boolean }) {
  const { view } = useStore();
  const [open, setOpen] = useState(defaultOpen);
  const today = todayIso();
  const p = weekProgress(week, view);
  const complete = p.done === p.total;

  return (
    <div className="relative">
      <span
        className={`absolute top-6 -left-6 size-[15px] rounded-full border-2 ${complete ? "bg-accent-gradient border-transparent" : isCurrent ? "border-accent bg-bg" : "border-line-strong bg-bg"}`}
        aria-hidden
      />
      <Card className={`p-0 ${isCurrent ? "border-accent/30" : ""}`}>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-5 p-5 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-accent">Semana {week.number}</span>
              <span className="text-xs text-faint">{shortRange(week.start, week.end)}</span>
              {isCurrent && <Pill tone="accent">Esta semana</Pill>}
              {complete && <Pill tone="accent">Completada</Pill>}
            </div>
            <p className="mt-1 text-lg font-semibold tracking-tight">{week.title}</p>
            <p className="mt-0.5 text-sm text-muted">{week.goal}</p>
          </div>
          <div className="hidden w-64 shrink-0 sm:block">
            <div className="mb-1.5 flex justify-between gap-3 text-xs whitespace-nowrap text-muted tabular-nums">
              <span>
                {p.done}/{p.total} tareas
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatMinutes(p.studied)} / {formatMinutes(p.estimate)}
              </span>
            </div>
            <ProgressBar value={p.done} max={p.total} label={`Progreso de la semana ${week.number}`} />
          </div>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted">
            <ChevronDown className="size-5" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }} className="overflow-hidden">
              <div className="space-y-5 border-t border-line px-5 pt-4 pb-5">
                {week.days.map((day) => {
                  const tasks = day.tasks.filter(keep);
                  if (tasks.length === 0) return null;
                  const late = day.date < today && day.tasks.some((t) => !isDone(view, t.id));
                  return (
                    <div key={day.date}>
                      <div className="mb-1.5 flex items-center gap-2 px-1">
                        <span className={`text-sm font-medium ${day.date === today ? "text-accent" : ""}`}>{weekdayLong(day.date)}</span>
                        <span className="text-xs text-faint">{shortDate(day.date)}</span>
                        <span className="text-xs text-muted">· {day.title}</span>
                        {day.kind === "review" && <Pill>Repaso</Pill>}
                        {late && (
                          <span className="ml-auto flex items-center gap-1 text-[11px] text-warning">
                            <Flag className="size-3" /> Pendiente
                          </span>
                        )}
                      </div>
                      <ul className="space-y-0.5">
                        {tasks.map((t) => (
                          <TaskRow key={t.id} task={t} overdue={day.date < today} />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
