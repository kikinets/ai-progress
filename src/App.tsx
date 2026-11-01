import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { loadProgress, loadRoadmap, setTaskDone } from "./lib/api";
import { todayIso } from "./lib/dates";
import { ProgressBar } from "./components/ProgressBar";
import { StreakBadge } from "./components/StreakBadge";
import { WeekCard } from "./components/WeekCard";
import type { Progress } from "./types/progress";
import type { Roadmap, Task } from "./types/roadmap";

function App() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadRoadmap(), loadProgress()])
      .then(([r, p]) => {
        setRoadmap(r);
        setProgress(p);
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  async function toggleTask(task: Task) {
    if (!progress) return;
    const done = !progress.completed[task.id];

    // Optimistic update: the check animates right away; Rust's answer replaces it.
    const previous = progress;
    const completed = { ...progress.completed };
    if (done) completed[task.id] = new Date().toISOString();
    else delete completed[task.id];
    setProgress({ ...progress, completed });

    try {
      setProgress(await setTaskDone(task.id, done));
      setSaveError(null);
    } catch (e) {
      setProgress(previous);
      setSaveError(String(e));
    }
  }

  if (loadError) {
    return <p className="p-8 text-red-600">No se pudo cargar: {loadError}</p>;
  }
  if (!roadmap || !progress) {
    return <p className="p-8 text-muted">Cargando…</p>;
  }

  const allTasks = roadmap.phases.flatMap((p) => p.weeks.flatMap((w) => w.tasks));
  const doneCount = allTasks.filter((t) => progress.completed[t.id]).length;
  const percent = allTasks.length === 0 ? 0 : Math.round((doneCount / allTasks.length) * 100);
  const today = todayIso();

  return (
    // reducedMotion="user" disables transform animations when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      <motion.main
        className="mx-auto max-w-3xl p-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">{roadmap.title}</h1>
            <p className="mt-1 text-muted">{roadmap.goal}</p>
          </div>
          <StreakBadge streak={progress.streak} />
        </header>

        <div className="mt-6">
          <div className="mb-1.5 flex justify-between text-sm">
            <span>
              {doneCount} de {allTasks.length} tareas
            </span>
            <span className="tabular-nums text-muted">{percent} %</span>
          </div>
          <ProgressBar value={doneCount} max={allTasks.length} label="Progreso total" />
        </div>

        {saveError && (
          <p role="alert" className="mt-4 rounded-md border border-red-600 p-3 text-sm text-red-600">
            No se pudo guardar el cambio: {saveError}
          </p>
        )}

        {roadmap.phases.map((phase) => (
          <section key={phase.id} className="mt-8">
            <h2 className="text-lg font-semibold text-accent">{phase.name}</h2>
            {phase.note && <p className="text-sm text-muted">{phase.note}</p>}

            {phase.weeks.map((week) => (
              <WeekCard
                key={week.id}
                week={week}
                isCurrent={week.start <= today && today <= week.end}
                completed={progress.completed}
                onToggle={toggleTask}
              />
            ))}
          </section>
        ))}
      </motion.main>
    </MotionConfig>
  );
}

export default App;
