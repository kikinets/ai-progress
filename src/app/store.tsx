// App-wide state: the roadmap, the latest progress view from Rust, and the actions that change it.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "../lib/api";
import { badgeInfo } from "../lib/badges";
import { celebrate } from "../components/Celebration";
import { toast } from "../components/Toasts";
import type { ProgressUpdate, ProgressView, TimerMode } from "../types/progress";
import type { Roadmap, Task } from "../types/roadmap";

export type Section = "today" | "plan" | "skills" | "achievements" | "coach";

interface Store {
  roadmap: Roadmap;
  view: ProgressView;
  /** When `view` arrived, to tick the timer locally between updates. */
  viewAt: number;
  section: Section;
  setSection: (s: Section) => void;
  drawerTaskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
  taskById: Map<string, Task>;
  actions: {
    setTaskDone: (id: string, done: boolean) => Promise<void>;
    setSubtaskDone: (taskId: string, subtaskId: string, done: boolean) => Promise<void>;
    saveNotes: (taskId: string, notes: string) => Promise<boolean>;
    startSession: (taskId: string, mode: TimerMode) => Promise<void>;
    pauseSession: () => Promise<void>;
    resumeSession: () => Promise<void>;
    stopSession: () => Promise<void>;
  };
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore outside StoreProvider");
  return store;
}

function announce(update: ProgressUpdate) {
  for (const id of update.newBadges) {
    const info = badgeInfo(id);
    toast("celebrate", `Insignia desbloqueada: ${info?.name ?? id}`, info?.description);
  }
  if (update.levelUp) toast("celebrate", `¡Has subido al nivel ${update.levelUp}!`, "Sigue así.");
  if (update.levelUp) celebrate("level");
  else if (update.newBadges.includes("week-complete")) celebrate("week");
  else if (update.newBadges.length > 0) celebrate("badge");
}

export function StoreProvider({ children, fallback }: { children: ReactNode; fallback: (error: string | null) => ReactNode }) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [view, setView] = useState<{ view: ProgressView; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("today");
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.loadRoadmap(), api.loadProgress()])
      .then(([r, v]) => {
        setRoadmap(r);
        setView({ view: v, at: Date.now() });
        if (v.notice) toast("info", v.notice);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const run = useCallback(async (cmd: () => Promise<ProgressUpdate>): Promise<boolean> => {
    try {
      const update = await cmd();
      setView({ view: update.view, at: Date.now() });
      announce(update);
      return true;
    } catch (e) {
      toast("error", "No se pudo guardar", String(e));
      return false;
    }
  }, []);

  const actions = useMemo<Store["actions"]>(
    () => ({
      setTaskDone: async (id, done) => void (await run(() => api.setTaskDone(id, done))),
      setSubtaskDone: async (t, s, done) => void (await run(() => api.setSubtaskDone(t, s, done))),
      saveNotes: (t, notes) => run(() => api.saveNotes(t, notes)),
      startSession: async (t, mode) => void (await run(() => api.startSession(t, mode))),
      pauseSession: async () => void (await run(api.pauseSession)),
      resumeSession: async () => void (await run(api.resumeSession)),
      stopSession: async () => void (await run(api.stopSession)),
    }),
    [run],
  );

  const taskById = useMemo(
    () => new Map((roadmap?.phases ?? []).flatMap((p) => p.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks))).map((t) => [t.id, t])),
    [roadmap],
  );

  if (!roadmap || !view) return <>{fallback(error)}</>;

  const store: Store = {
    roadmap,
    view: view.view,
    viewAt: view.at,
    section,
    setSection,
    drawerTaskId,
    openTask: setDrawerTaskId,
    closeTask: () => setDrawerTaskId(null),
    taskById,
    actions,
  };
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
