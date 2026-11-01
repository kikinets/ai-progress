import type { SkillInfo } from "../lib/skills";
import type { Task } from "../types/roadmap";
import { STATUS_LABEL } from "./SkillNode";
import { TaskItem } from "./TaskItem";

interface Props {
  info: SkillInfo | undefined;
  infos: Map<string, SkillInfo>;
  completed: Record<string, string>;
  onSelect: (id: string) => void;
  onToggle: (task: Task) => void;
}

export function SkillPanel({ info, infos, completed, onSelect, onToggle }: Props) {
  if (!info) {
    return <p className="mt-4 text-sm text-muted">Pulsa una habilidad para ver sus requisitos y tareas.</p>;
  }

  const requires = info.skill.requires.map((id) => infos.get(id)).filter((r) => r !== undefined);

  return (
    <section className="mt-4 rounded-lg border border-line p-4" aria-live="polite">
      <header className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium">{info.skill.name}</h3>
        <span className="text-sm text-muted">
          {STATUS_LABEL[info.status]} · {info.done}/{info.tasks.length} tareas
        </span>
      </header>

      {requires.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          Requiere:{" "}
          {requires.map((r, i) => (
            <span key={r.skill.id}>
              {i > 0 && ", "}
              <button
                type="button"
                onClick={() => onSelect(r.skill.id)}
                className={`underline-offset-2 hover:underline ${r.status === "done" ? "text-accent" : "text-ink"}`}
              >
                {r.skill.name}
              </button>
            </span>
          ))}
        </p>
      )}

      <ul className="mt-3 space-y-0.5">
        {info.tasks.map((task) => (
          <TaskItem key={task.id} task={task} done={Boolean(completed[task.id])} onToggle={onToggle} />
        ))}
      </ul>
    </section>
  );
}
