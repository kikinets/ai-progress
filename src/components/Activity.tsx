import * as Tooltip from "@radix-ui/react-tooltip";
import { motion } from "motion/react";
import { parseLocal, shortDate, weekdayShort } from "../lib/dates";
import { formatMinutes, heatmapLevel } from "../lib/format";
import type { DayStat } from "../types/progress";

const LEVEL_STYLE = [
  "bg-surface-3",
  "bg-accent-from/25",
  "bg-accent-from/50",
  "bg-accent-from/75",
  "bg-accent-gradient",
];

/** GitHub-style grid: one column per week (Monday on top), last 12 weeks. */
export function Heatmap({ days }: { days: DayStat[] }) {
  const max = Math.max(0, ...days.map((d) => d.minutes));
  // Pad the front so the first column starts on a Monday.
  const offset = (parseLocal(days[0].date).getDay() + 6) % 7;
  const cells: (DayStat | null)[] = [...Array(offset).fill(null), ...days];

  return (
    <Tooltip.Provider delayDuration={80}>
      <div className="flex gap-3">
        <div className="grid grid-rows-7 gap-1 pt-0.5 text-[10px] text-faint">
          {["L", "", "X", "", "V", "", "D"].map((l, i) => (
            <span key={i} className="h-3.5 leading-3.5">
              {l}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1">
          {cells.map((d, i) =>
            d ? (
              <Tooltip.Root key={d.date}>
                <Tooltip.Trigger asChild>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.004, 0.3) }}
                    className={`h-3.5 rounded-[4px] ${LEVEL_STYLE[heatmapLevel(d.minutes, max)]}`}
                    aria-label={`${shortDate(d.date)}: ${d.minutes} minutos`}
                  />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content sideOffset={6} className="surface z-50 rounded-lg px-2.5 py-1.5 text-xs">
                    <span className="font-medium">{shortDate(d.date)}</span>
                    <span className="text-muted"> · {formatMinutes(d.minutes)} · {d.tasksDone} {d.tasksDone === 1 ? "tarea" : "tareas"}</span>
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : (
              <span key={`pad-${i}`} />
            ),
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-faint">
        Menos
        {LEVEL_STYLE.map((c) => (
          <span key={c} className={`size-2.5 rounded-[3px] ${c}`} />
        ))}
        Más
      </div>
    </Tooltip.Provider>
  );
}

/** Minutes per day for the last 7 days ending today. */
export function WeekBars({ days, target }: { days: DayStat[]; target: number }) {
  const week = days.slice(-7);
  const max = Math.max(target, ...week.map((d) => d.minutes), 1);
  return (
    <div className="flex h-24 items-end gap-2">
      {week.map((d, i) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5" title={`${shortDate(d.date)}: ${formatMinutes(d.minutes)}`}>
          <div className="relative flex h-20 w-full items-end overflow-hidden rounded-md bg-surface-2">
            <motion.div
              className={`w-full rounded-md ${i === week.length - 1 ? "bg-accent-gradient" : "bg-accent-from/45"}`}
              initial={{ height: 0 }}
              animate={{ height: `${(d.minutes / max) * 100}%` }}
              transition={{ type: "spring", visualDuration: 0.4, bounce: 0.15, delay: i * 0.03 }}
            />
            <div className="absolute inset-x-0 border-t border-dashed border-line-strong" style={{ bottom: `${(target / max) * 100}%` }} />
          </div>
          <span className={`text-[10px] ${i === week.length - 1 ? "text-ink" : "text-faint"}`}>{weekdayShort(d.date)}</span>
        </div>
      ))}
    </div>
  );
}
