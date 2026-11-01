import { todayIso } from "../lib/dates";
import type { Roadmap, Task } from "../types/roadmap";
import { WeekCard } from "./WeekCard";

interface Props {
  roadmap: Roadmap;
  completed: Record<string, string>;
  onToggle: (task: Task) => void;
}

export function RoadmapView({ roadmap, completed, onToggle }: Props) {
  const today = todayIso();

  return roadmap.phases.map((phase) => (
    <section key={phase.id} className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold text-accent">{phase.name}</h2>
      {phase.note && <p className="text-sm text-muted">{phase.note}</p>}

      {phase.weeks.map((week) => (
        <WeekCard
          key={week.id}
          week={week}
          isCurrent={week.start <= today && today <= week.end}
          completed={completed}
          onToggle={onToggle}
        />
      ))}
    </section>
  ));
}
