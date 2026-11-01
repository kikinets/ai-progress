import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MotionConfig, motion } from "motion/react";
import type { Roadmap } from "./types/roadmap";

function App() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<Roadmap>("load_roadmap")
      .then(setRoadmap)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return <p className="p-8 text-red-600">Could not load roadmap: {error}</p>;
  }
  if (!roadmap) {
    return <p className="p-8 text-muted">Loading…</p>;
  }

  return (
    // reducedMotion="user" disables transform animations when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      <motion.main
        className="mx-auto max-w-3xl p-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-2xl font-semibold">{roadmap.title}</h1>
        <p className="mt-1 text-muted">{roadmap.goal}</p>

        {roadmap.phases.map((phase) => (
          <section key={phase.id} className="mt-8">
            <h2 className="text-lg font-semibold text-accent">{phase.name}</h2>
            {phase.note && <p className="text-sm text-muted">{phase.note}</p>}

            {phase.weeks.map((week) => (
              <div key={week.id} className="mt-4 rounded-lg border border-line p-4">
                <h3 className="font-medium">
                  Week {week.number}: {week.title}
                </h3>
                <p className="text-xs text-muted">
                  {week.start} → {week.end}
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {week.tasks.map((task) => (
                    <li key={task.id}>{task.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </motion.main>
    </MotionConfig>
  );
}

export default App;
