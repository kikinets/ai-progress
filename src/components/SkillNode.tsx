import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { SkillInfo, SkillStatus } from "../lib/skills";
import { ProgressBar } from "./ProgressBar";

export type SkillNodeType = Node<{ info: SkillInfo }, "skill">;

export const STATUS_LABEL: Record<SkillStatus, string> = {
  locked: "Bloqueada",
  available: "Disponible",
  "in-progress": "En curso",
  done: "Completada",
};

const STATUS_STYLE: Record<SkillStatus, string> = {
  // Opaque background so edges passing behind locked nodes stay hidden.
  locked: "border-dashed border-line text-muted",
  available: "border-line",
  "in-progress": "border-accent",
  done: "border-accent bg-accent/15",
};

// Edges need anchor points, but the map is read-only, so the handles stay invisible.
const hiddenHandle = "!size-1 !min-w-0 !border-0 !bg-transparent";

export function SkillNode({ data, selected }: NodeProps<SkillNodeType>) {
  const { skill, tasks, done, status } = data.info;

  return (
    <div
      className={`w-44 cursor-pointer rounded-lg border-2 bg-surface px-3 py-2 transition-colors duration-200 ${
        status === "locked" ? "" : "text-ink"
      } ${
        STATUS_STYLE[status]
      } ${selected ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className={hiddenHandle} />
      <p className="text-sm font-medium">{skill.name}</p>
      <p className="text-[11px] text-muted">
        {STATUS_LABEL[status]} · {done}/{tasks.length}
      </p>
      <ProgressBar value={done} max={tasks.length} label={`Progreso de ${skill.name}`} className="mt-1.5 !h-1" />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={hiddenHandle} />
    </div>
  );
}
