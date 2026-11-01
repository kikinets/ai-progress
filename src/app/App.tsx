import { useEffect, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { TaskDrawer } from "../components/TaskDrawer";
import { Toasts } from "../components/Toasts";
import { Achievements } from "../screens/Achievements";
import { Coach } from "../screens/Coach";
import { Plan } from "../screens/Plan";
import { Skills } from "../screens/Skills";
import { Today } from "../screens/Today";
import { CommandPalette } from "./CommandPalette";
import { SECTIONS, Sidebar } from "./Sidebar";
import { StoreProvider, useStore } from "./store";
import { TimerProvider } from "./useTimer";

const SCREENS = { today: Today, plan: Plan, skills: Skills, achievements: Achievements, coach: Coach };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function Shell() {
  const { section, setSection, view, actions, drawerTaskId } = useStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const Screen = SCREENS[section];

  // Each section starts at the top.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [section]);

  // Keyboard: Ctrl+K palette, 1-5 sections, Space pause/resume.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (isTyping(e.target) || paletteOpen || drawerTaskId || e.ctrlKey || e.metaKey || e.altKey) return;
      const index = Number(e.key) - 1;
      if (index >= 0 && index < SECTIONS.length) setSection(SECTIONS[index].id);
      if (e.key === " " && view.activeSession) {
        e.preventDefault();
        if (view.activeSession.paused) actions.resumeSession();
        else actions.pauseSession();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, drawerTaskId, view.activeSession, actions, setSection]);

  return (
    <div className="relative flex h-full">
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      <main ref={mainRef} className="relative z-10 flex-1 overflow-y-auto">
        <Screen key={section} />
      </main>
      <TaskDrawer />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toasts />
    </div>
  );
}

export function App() {
  return (
    // reducedMotion="user" keeps fades but drops movement when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      <StoreProvider
        fallback={(error) => (
          <div className="grid h-full place-items-center">
            {error ? <p className="max-w-md text-center text-danger">No se pudo cargar la app: {error}</p> : <p className="text-muted">Cargando…</p>}
          </div>
        )}
      >
        <TimerProvider>
          <Shell />
        </TimerProvider>
      </StoreProvider>
    </MotionConfig>
  );
}
