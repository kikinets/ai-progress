import { AnimatePresence, motion } from "motion/react";
import { Coffee, Pause, Play, Square, Timer as TimerIcon } from "lucide-react";
import { useState } from "react";
import { useStore } from "../app/store";
import { FOCUS_SECONDS, useTimer } from "../app/useTimer";
import { formatClock } from "../lib/format";
import { placedTasks, tasksForToday } from "../lib/plan";
import { todayIso } from "../lib/dates";
import type { TimerMode } from "../types/progress";
import { Button, Card, CardTitle, Ring } from "./ui";

const PHASE_LABEL = { idle: "Listo", focus: "Concentración", paused: "En pausa", break: "Descanso" } as const;

/** Big timer card for the Today screen. */
export function TimerCard() {
  const { view, roadmap, taskById, actions } = useStore();
  const timer = useTimer();
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const session = view.activeSession;

  // Today's first pending task, or else the next pending one in the plan.
  const pending = ({ task }: { task: { id: string } }) => !view.tasks[task.id]?.completedAt;
  const suggestion = (tasksForToday(roadmap, view, todayIso()).find(pending) ?? placedTasks(roadmap).find(pending))?.task;
  const task = session ? taskById.get(session.taskId) : suggestion;

  const ringValue =
    timer.phase === "idle" ? 0 : timer.remaining === null ? timer.elapsed % 3600 : timer.phase === "break" ? timer.remaining : FOCUS_SECONDS - timer.remaining;
  const ringMax = timer.phase === "break" ? Math.max(timer.remaining ?? 1, 300) : timer.remaining === null ? 3600 : FOCUS_SECONDS;
  const clock = timer.phase === "idle" ? (mode === "pomodoro" ? "25:00" : "00:00") : formatClock(timer.remaining ?? timer.elapsed);

  return (
    <Card className="flex flex-col">
      <CardTitle
        icon={<TimerIcon className="size-4" />}
        aside={
          !session && (
            <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs" role="radiogroup" aria-label="Modo">
              {(["pomodoro", "free"] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`relative rounded-md px-2.5 py-1 transition-colors ${mode === m ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  {mode === m && <motion.span layoutId="timer-mode" className="absolute inset-0 rounded-md bg-surface-3" transition={{ duration: 0.2 }} />}
                  <span className="relative">{m === "pomodoro" ? "Pomodoro" : "Libre"}</span>
                </button>
              ))}
            </div>
          )
        }
      >
        Temporizador
      </CardTitle>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2">
        <Ring value={ringValue} max={ringMax} size={176} stroke={12} label="Progreso del temporizador">
          <div>
            <p className="font-mono text-4xl font-medium tracking-tight tabular-nums">{clock}</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={timer.phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="mt-1 text-xs text-muted">
                {PHASE_LABEL[timer.phase]}
                {session?.mode === "pomodoro" && timer.blocks > 0 && ` · ${timer.blocks} ${timer.blocks === 1 ? "bloque" : "bloques"}`}
              </motion.p>
            </AnimatePresence>
          </div>
        </Ring>

        <p className="line-clamp-2 min-h-10 max-w-64 text-center text-sm text-muted">
          {task ? task.title : "No hay tareas pendientes para hoy."}
        </p>

        <div className="flex gap-2">
          {!session && (
            <Button variant="primary" disabled={!task} onClick={() => task && actions.startSession(task.id, mode)}>
              <Play className="size-4" /> Empezar
            </Button>
          )}
          {timer.phase === "focus" && (
            <Button onClick={actions.pauseSession}>
              <Pause className="size-4" /> Pausa
            </Button>
          )}
          {timer.phase === "paused" && (
            <Button variant="primary" onClick={actions.resumeSession}>
              <Play className="size-4" /> Seguir
            </Button>
          )}
          {timer.phase === "break" && (
            <Button
              variant="primary"
              onClick={() => {
                timer.skipBreak();
                actions.resumeSession();
              }}
            >
              <Coffee className="size-4" /> Saltar descanso
            </Button>
          )}
          {session && (
            <Button variant="ghost" onClick={actions.stopSession} title="Terminar y guardar la sesión">
              <Square className="size-4" /> Terminar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Compact timer shown in the sidebar while a session is active. */
export function MiniTimer() {
  const { view, taskById, actions, openTask } = useStore();
  const timer = useTimer();
  const session = view.activeSession;

  return (
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="surface rounded-xl p-3"
        >
          <button onClick={() => openTask(session.taskId)} className="block w-full truncate text-left text-xs text-muted hover:text-ink">
            {taskById.get(session.taskId)?.title}
          </button>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-lg tabular-nums">{formatClock(timer.remaining ?? timer.elapsed)}</span>
            <div className="flex gap-1">
              {timer.phase === "focus" ? (
                <IconButton label="Pausa" onClick={actions.pauseSession}>
                  <Pause className="size-3.5" />
                </IconButton>
              ) : (
                <IconButton
                  label="Seguir"
                  onClick={() => {
                    timer.skipBreak();
                    actions.resumeSession();
                  }}
                >
                  <Play className="size-3.5" />
                </IconButton>
              )}
              <IconButton label="Terminar" onClick={actions.stopSession}>
                <Square className="size-3.5" />
              </IconButton>
            </div>
          </div>
          <p className="mt-0.5 text-[11px] text-faint">{PHASE_LABEL[timer.phase]}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-ink">
      {children}
    </button>
  );
}
