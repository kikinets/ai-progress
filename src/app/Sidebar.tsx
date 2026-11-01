import { motion } from "motion/react";
import { Map, Moon, Network, Search, Sparkles, Sun, Sunrise, Trophy } from "lucide-react";
import { MiniTimer } from "../components/Timer";
import { ProgressBar } from "../components/ui";
import { useStore, type Section } from "./store";
import { useTheme } from "./theme";

export const SECTIONS: { id: Section; label: string; icon: typeof Map }[] = [
  { id: "today", label: "Hoy", icon: Sunrise },
  { id: "plan", label: "Plan", icon: Map },
  { id: "skills", label: "Habilidades", icon: Network },
  { id: "achievements", label: "Logros", icon: Trophy },
  { id: "coach", label: "Coach", icon: Sparkles },
];

export function Sidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { section, setSection, view } = useStore();
  const [theme, toggleTheme] = useTheme();

  return (
    <aside className="relative z-10 flex w-[220px] shrink-0 flex-col gap-6 border-r border-line bg-surface-1/60 px-3 py-5 backdrop-blur">
      <div className="flex items-center gap-2.5 px-2">
        <span className="bg-accent-gradient grid size-8 place-items-center rounded-xl text-sm font-bold text-white shadow-[0_6px_20px_-6px_var(--color-accent-from)]">AI</span>
        <span className="font-semibold tracking-tight">AI Progress</span>
      </div>

      <button
        onClick={onOpenPalette}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        <Search className="size-3.5" />
        Buscar…
        <kbd className="ml-auto rounded border border-line px-1 font-mono text-[10px]">Ctrl K</kbd>
      </button>

      <nav className="flex flex-col gap-0.5" aria-label="Secciones">
        {SECTIONS.map(({ id, label, icon: Icon }, i) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150 ${active ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {active && (
                <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-surface-2" transition={{ type: "spring", visualDuration: 0.25, bounce: 0.1 }}>
                  <span className="bg-accent-gradient absolute top-2 bottom-2 left-0 w-0.5 rounded-full" />
                </motion.span>
              )}
              <Icon className="relative size-4" />
              <span className="relative">{label}</span>
              <kbd className="relative ml-auto font-mono text-[10px] text-faint">{i + 1}</kbd>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <MiniTimer />
        <button onClick={() => setSection("achievements")} className="surface rounded-xl p-3 text-left transition-colors hover:border-line-strong">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted">Nivel</span>
            <span className="text-accent-gradient font-mono text-lg font-semibold">{view.xp.level}</span>
          </div>
          <ProgressBar value={view.xp.xpIntoLevel} max={view.xp.xpForNextLevel} label="XP hasta el siguiente nivel" className="mt-2" />
          <p className="mt-1.5 font-mono text-[10px] text-faint tabular-nums">
            {view.xp.xpIntoLevel} / {view.xp.xpForNextLevel} XP
          </p>
        </button>
        <button onClick={toggleTheme} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink">
          {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          {theme === "dark" ? "Tema claro" : "Tema oscuro"}
        </button>
      </div>
    </aside>
  );
}
