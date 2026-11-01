import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { useStore } from "../app/store";
import { Card, CountUp, ProgressBar, Ring, Screen, ScreenHeader } from "../components/ui";
import { badgeInfo } from "../lib/badges";
import { shortDate, toIso } from "../lib/dates";
import type { BadgeView } from "../types/progress";

const localDate = (iso: string) => shortDate(toIso(new Date(iso)));

export function Achievements() {
  const { view } = useStore();
  const unlocked = view.badges.filter((b) => b.unlockedAt);
  const recent = [...unlocked].sort((a, b) => b.unlockedAt!.localeCompare(a.unlockedAt!)).slice(0, 10);

  return (
    <Screen>
      <ScreenHeader title="Logros" subtitle={`${unlocked.length} de ${view.badges.length} insignias desbloqueadas`} />

      <Card className="mb-6 flex items-center gap-8 p-7">
        <Ring value={view.xp.xpIntoLevel} max={view.xp.xpForNextLevel} size={150} stroke={12} label="XP del nivel actual">
          <div>
            <p className="text-xs text-muted">Nivel</p>
            <p className="text-accent-gradient font-mono text-5xl font-semibold">{view.xp.level}</p>
          </div>
        </Ring>
        <div className="flex-1">
          <p className="text-4xl font-semibold tracking-tight">
            <CountUp value={view.xp.total} /> <span className="text-xl text-muted">XP</span>
          </p>
          <p className="mt-1 text-muted tabular-nums">
            {view.xp.xpForNextLevel - view.xp.xpIntoLevel} XP para el nivel {view.xp.level + 1}
          </p>
          <div className="mt-5 grid max-w-md grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted">
            <span>Subtarea · 5 XP</span>
            <span>Tarea · 20 XP</span>
            <span>Repaso · 30 XP</span>
            <span>Entregable · 80 XP</span>
            <span className="col-span-2">Estudio · 1 XP cada 5 minutos</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {view.badges.map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.025 }}>
            <BadgeTile badge={b} />
          </motion.div>
        ))}
      </div>

      {recent.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-muted">Últimas insignias</h2>
          <ul className="divide-y divide-line">
            {recent.map((b) => {
              const info = badgeInfo(b.id);
              const Icon = info.icon;
              return (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <Icon className="size-4 text-accent" />
                  <span className="text-sm">{info.name}</span>
                  <span className="ml-auto text-xs text-faint">{localDate(b.unlockedAt!)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </Screen>
  );
}

function BadgeTile({ badge }: { badge: BadgeView }) {
  const info = badgeInfo(badge.id);
  const Icon = info.icon;
  const unlocked = Boolean(badge.unlockedAt);

  return (
    <div className={`surface relative flex h-full flex-col items-center rounded-2xl p-4 text-center transition-colors ${unlocked ? "border-accent/30" : ""}`}>
      <div
        className={`relative grid size-14 place-items-center rounded-2xl ${
          unlocked ? "bg-accent-gradient text-white shadow-[0_8px_30px_-8px_var(--color-accent-from)]" : "bg-surface-2 text-faint"
        }`}
      >
        <Icon className="size-6" />
        {!unlocked && (
          <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border border-line bg-surface-1">
            <Lock className="size-2.5" />
          </span>
        )}
      </div>
      <p className={`mt-3 text-sm font-medium ${unlocked ? "" : "text-muted"}`}>{info.name}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-faint">{info.description}</p>
      <div className="mt-auto w-full pt-3">
        {unlocked ? (
          <p className="text-[11px] text-accent">{localDate(badge.unlockedAt!)}</p>
        ) : (
          <>
            <ProgressBar value={badge.progress} max={badge.target} label={`Progreso de ${info.name}`} />
            <p className="mt-1 font-mono text-[10px] text-faint tabular-nums">
              {badge.progress}/{badge.target}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
