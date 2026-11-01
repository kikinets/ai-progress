import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { loadProgress, loadRoadmap, setTaskDone } from "./lib/api";
import { ProgressBar } from "./components/ProgressBar";
import { RoadmapView } from "./components/RoadmapView";
import { SkillsView } from "./components/SkillsView";
import { StreakBadge } from "./components/StreakBadge";
import type { Progress } from "./types/progress";
import type { Roadmap, Task } from "./types/roadmap";

type View = "roadmap" | "skills";

const TABS: { id: View; label: string }[] = [
  { id: "roadmap", label: "Roadmap" },
  { id: "skills", label: "Habilidades" },
];

function App() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [view, setView] = useState<View>("roadmap");
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

  return (
    // reducedMotion="user" disables transform animations when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      <motion.main
        className="mx-auto max-w-4xl p-8"
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

        <nav role="tablist" className="mt-6 mb-6 flex gap-1 border-b border-line">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={view === tab.id}
              onClick={() => setView(tab.id)}
              className={`relative px-3 py-2 text-sm transition-colors duration-150 ${
                view === tab.id ? "font-medium text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {tab.label}
              {view === tab.id && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                  transition={{ type: "spring", visualDuration: 0.25, bounce: 0.1 }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Keyed by view so the new tab fades in; no exit animation, so content never waits. */}
        <motion.div
          key={view}
          role="tabpanel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {view === "roadmap" ? (
            <RoadmapView roadmap={roadmap} completed={progress.completed} onToggle={toggleTask} />
          ) : (
            <SkillsView roadmap={roadmap} completed={progress.completed} onToggle={toggleTask} />
          )}
        </motion.div>
      </motion.main>
    </MotionConfig>
  );
}

export default App;
