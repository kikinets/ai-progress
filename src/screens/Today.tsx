import { motion } from "motion/react";
import { CalendarDays, Flame, Package, Target, TrendingUp } from "lucide-react";
import { useStore } from "../app/store";
import { Heatmap, WeekBars } from "../components/Activity";
import { TaskRow } from "../components/TaskRow";
import { TimerCard } from "../components/Timer";
import { Card, CardTitle, CountUp, ProgressBar, Ring, Screen, ScreenHeader } from "../components/ui";
import { badgeInfo } from "../lib/badges";
import { greeting, longDate, shortDate, todayIso } from "../lib/dates";
import { formatMinutes } from "../lib/format";
import { currentWeek, isDone, nextDeliverable, tasksForToday } from "../lib/plan";

export function Today() {
  const { roadmap, view, openTask } = useStore();
  const today = todayIso();
  const tasks = tasksForToday(roadmap, view, today);
  const pending = tasks.filter(({ task }) => !isDone(view, task.id)).length;
  const week = currentWeek(roadmap, today);
  const firstDay = roadmap.phases[0]?.weeks[0]?.start;
  const deliverable = nextDeliverable(roadmap, view);
  const nearestBadge = view.badges
    .filter((b) => !b.unlockedAt && b.progress > 0)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];

  return (
    <Screen>
      <ScreenHeader
        title={`${greeting(new Date().getHours())}, Enrique`}
        subtitle={
          <span className="capitalize-first">
            {longDate(today)}
            {week && <span className="text-faint"> · Semana {week.number}: {week.title}</span>}
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<CalendarDays className="size-4" />} aside={<span className="text-xs text-muted tabular-nums">{pending} pendientes</span>}>
            Para hoy
          </CardTitle>
          {tasks.length > 0 ? (
            <motion.ul className="-mx-2 space-y-0.5" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }}>
              {tasks.map(({ task, overdue }) => (
                <motion.div key={task.id} variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }}>
                  <TaskRow task={task} overdue={overdue} />
                </motion.div>
              ))}
            </motion.ul>
          ) : (
            <div className="grid place-items-center py-10 text-center">
              <p className="font-medium">{firstDay && today < firstDay ? `El plan empieza el ${shortDate(firstDay)}` : "No hay nada asignado para hoy"}</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                {firstDay && today < firstDay
                  ? "Aprovecha para preparar el entorno o echar un vistazo al plan."
                  : "Buen momento para repasar notas o adelantar una tarea del plan."}
              </p>
            </div>
          )}
        </Card>

        <TimerCard />

        <Card>
          <CardTitle icon={<Flame className={`size-4 ${view.streak.studiedToday ? "text-warning" : ""}`} />}>Racha</CardTitle>
          <div className="flex items-end gap-2">
            <motion.span
              key={view.streak.current}
              initial={{ scale: 1.25, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", visualDuration: 0.3, bounce: 0.45 }}
              className={`font-mono text-5xl font-semibold tabular-nums ${view.streak.current > 0 ? "text-accent-gradient" : ""}`}
            >
              {view.streak.current}
            </motion.span>
            <span className="mb-1.5 text-muted">{view.streak.current === 1 ? "día" : "días"}</span>
          </div>
          <p className="mt-3 text-sm text-muted">
            {view.streak.studiedToday
              ? `Hoy ya cuenta. Récord: ${view.streak.longest} días.`
              : view.streak.current > 0
                ? "Estudia 10 minutos o completa algo hoy para mantenerla."
                : "Estudia 10 minutos o completa una tarea para empezarla."}
          </p>
        </Card>

        <Card>
          <CardTitle icon={<TrendingUp className="size-4" />}>Esta semana</CardTitle>
          <div className="flex items-center gap-5">
            <Ring value={view.stats.weekMinutes} max={view.stats.weekTargetMinutes} size={96} stroke={9} label="Minutos de la semana">
              <span className="font-mono text-sm font-medium tabular-nums">
                {Math.round((100 * view.stats.weekMinutes) / Math.max(1, view.stats.weekTargetMinutes))}%
              </span>
            </Ring>
            <div className="flex-1">
              <p className="text-2xl font-semibold tabular-nums">{formatMinutes(view.stats.weekMinutes)}</p>
              <p className="text-xs text-muted">de {formatMinutes(view.stats.weekTargetMinutes)} · hoy {formatMinutes(view.stats.todayMinutes)}</p>
            </div>
          </div>
          <div className="mt-4">
            <WeekBars days={view.stats.minutesByDay} target={roadmap.dailyTargetMinutes} />
          </div>
        </Card>

        <Card>
          <CardTitle icon={<Target className="size-4" />}>Nivel</CardTitle>
          <div className="flex items-baseline gap-2">
            <span className="text-accent-gradient font-mono text-5xl font-semibold">{view.xp.level}</span>
            <span className="text-sm text-muted">
              <CountUp value={view.xp.total} /> XP en total
            </span>
          </div>
          <ProgressBar value={view.xp.xpIntoLevel} max={view.xp.xpForNextLevel} label="XP hasta el siguiente nivel" className="mt-4" />
          <p className="mt-2 text-xs text-muted tabular-nums">
            Faltan {view.xp.xpForNextLevel - view.xp.xpIntoLevel} XP para el nivel {view.xp.level + 1}
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle aside={<span className="text-xs text-muted">{formatMinutes(view.stats.totalMinutes)} en total</span>}>Actividad · últimas 12 semanas</CardTitle>
          <Heatmap days={view.stats.minutesByDay} />
        </Card>

        <Card>
          <CardTitle icon={<Package className="size-4" />}>Próximo hito</CardTitle>
          {deliverable ? (
            <button onClick={() => openTask(deliverable.task.id)} className="w-full rounded-xl border border-line bg-surface-2 p-3.5 text-left transition-colors hover:border-line-strong">
              <p className="text-xs text-accent">{shortDate(deliverable.day.date)} · Semana {deliverable.week.number}</p>
              <p className="mt-1 text-sm font-medium">{deliverable.task.title.replace(/^Entregable: /, "")}</p>
            </button>
          ) : (
            <p className="text-sm text-muted">Todos los entregables están hechos. 🎉</p>
          )}
          {nearestBadge && (
            <div className="mt-3 rounded-xl border border-line p-3.5">
              <p className="text-xs text-muted">Insignia más cercana</p>
              <p className="mt-1 text-sm font-medium">{badgeInfo(nearestBadge.id)?.name}</p>
              <ProgressBar value={nearestBadge.progress} max={nearestBadge.target} label="Progreso de la insignia" className="mt-2" />
              <p className="mt-1 text-[11px] text-faint tabular-nums">
                {nearestBadge.progress}/{nearestBadge.target}
              </p>
            </div>
          )}
        </Card>
      </div>
    </Screen>
  );
}
