import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, CircleCheck, Clock, ExternalLink, FileText, GraduationCap, Hammer, Lightbulb, Play, Video, X } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useStore } from "../app/store";
import { longDate } from "../lib/dates";
import { formatMinutes } from "../lib/format";
import { subtasksDone } from "../lib/plan";
import type { ResourceKind } from "../types/roadmap";
import { NotesEditor } from "./NotesEditor";
import { TYPE_LABEL } from "./TaskRow";
import { Button, Checkbox, Pill, ProgressBar, RichText } from "./ui";

const RESOURCE_ICON: Record<ResourceKind, typeof BookOpen> = {
  doc: BookOpen,
  video: Video,
  course: GraduationCap,
  article: FileText,
  practice: Hammer,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-faint uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function TaskDrawer() {
  const { drawerTaskId, closeTask } = useStore();
  return (
    <Dialog.Root open={drawerTaskId !== null} onOpenChange={(open) => !open && closeTask()}>
      <AnimatePresence>
        {drawerTaskId && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside
                className="fixed top-0 right-0 bottom-0 z-50 flex w-[480px] max-w-full flex-col border-l border-line bg-surface-1 shadow-2xl outline-none"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", visualDuration: 0.25, bounce: 0.05 }}
              >
                <DrawerBody taskId={drawerTaskId} />
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function DrawerBody({ taskId }: { taskId: string }) {
  const { roadmap, view, taskById, actions } = useStore();
  const task = taskById.get(taskId);
  if (!task) return null;

  const progress = view.tasks[task.id];
  const done = Boolean(progress?.completedAt);
  const subDone = subtasksDone(task, progress);
  const day = roadmap.phases.flatMap((p) => p.weeks.flatMap((w) => w.days)).find((d) => d.tasks.some((t) => t.id === task.id));
  const studied = view.stats.minutesByTask[task.id] ?? 0;
  const skills = roadmap.skills.filter((s) => task.skills.includes(s.id));

  return (
    <>
      <header className="flex items-start gap-3 border-b border-line p-6">
        <Checkbox size="lg" checked={done} onChange={() => actions.setTaskDone(task.id, !done)} label="Tarea completada" />
        <div className="min-w-0 flex-1">
          <Dialog.Title className={`text-lg leading-snug font-semibold ${done ? "text-muted line-through" : ""}`}>{task.title}</Dialog.Title>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill tone={task.type === "deliverable" ? "accent" : "neutral"}>{TYPE_LABEL[task.type]}</Pill>
            {skills.map((s) => (
              <Pill key={s.id}>{s.name}</Pill>
            ))}
            {day && <span className="text-xs text-muted">· {longDate(day.date)}</span>}
          </div>
        </div>
        <Dialog.Close className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink" aria-label="Cerrar">
          <X className="size-4" />
        </Dialog.Close>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <Section title="Qué es">
          <p className="text-sm leading-relaxed">
            <RichText text={task.description} />
          </p>
        </Section>

        <div className="mt-4 flex gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3.5">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-muted">
            <span className="font-medium text-ink">Por qué importa. </span>
            {task.why}
          </p>
        </div>

        <Section title="Tiempo">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <ProgressBar value={studied} max={task.estimateMinutes} label="Tiempo estudiado frente al estimado" />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                <Clock className="size-3" /> {formatMinutes(studied)} de {formatMinutes(task.estimateMinutes)} estimados
              </p>
            </div>
            {!done && !view.activeSession && (
              <Button variant="primary" onClick={() => actions.startSession(task.id, "pomodoro")}>
                <Play className="size-4" /> Estudiar ahora
              </Button>
            )}
          </div>
        </Section>

        {task.subtasks.length > 0 && (
          <Section title={`Subtareas · ${subDone}/${task.subtasks.length}`}>
            <ul className="space-y-1">
              {task.subtasks.map((s) => {
                const checked = Boolean(progress?.subtasks[s.id]);
                return (
                  <li key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                    <Checkbox checked={checked} onChange={() => actions.setSubtaskDone(task.id, s.id, !checked)} label={s.title} />
                    <span className={`text-sm ${checked ? "text-faint line-through" : ""}`}>
                      <RichText text={s.title} />
                    </span>
                  </li>
                );
              })}
            </ul>
            <AnimatePresence>
              {subDone === task.subtasks.length && !done && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                  <Button variant="primary" className="mt-3 w-full" onClick={() => actions.setTaskDone(task.id, true)}>
                    <CircleCheck className="size-4" /> Marcar tarea como hecha
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>
        )}

        <Section title="Está hecha cuando…">
          <p className="rounded-xl border border-line bg-surface-2 p-3.5 text-sm leading-relaxed">
            <RichText text={task.doneWhen} />
          </p>
        </Section>

        <Section title="Recursos">
          <ul className="space-y-1.5">
            {task.resources.map((r) => {
              const Icon = RESOURCE_ICON[r.kind];
              return (
                <li key={r.url}>
                  <button
                    type="button"
                    onClick={() => openUrl(r.url)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-3"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-surface-3 text-accent">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{r.title}</span>
                      <span className="block truncate text-[11px] text-faint">{new URL(r.url).hostname}</span>
                    </span>
                    <ExternalLink className="size-3.5 text-faint group-hover:text-ink" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Notas">
          <NotesEditor key={task.id} taskId={task.id} initial={progress?.notes ?? ""} />
        </Section>
      </div>
    </>
  );
}
