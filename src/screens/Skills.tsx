import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Background, BackgroundVariant, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { CircleCheck, Lock } from "lucide-react";
import { useStore } from "../app/store";
import { useTheme } from "../app/theme";
import { TaskRow } from "../components/TaskRow";
import { Card, Pill, Ring, Screen, ScreenHeader } from "../components/ui";
import { isDone } from "../lib/plan";
import { skillInfos, type SkillInfo, type SkillStatus } from "../lib/skills";

const STATUS_LABEL: Record<SkillStatus, string> = {
  locked: "Bloqueada",
  available: "Disponible",
  "in-progress": "En curso",
  done: "Completada",
};

type SkillNodeType = Node<{ info: SkillInfo }, "skill">;

// Edges need anchors, but the map is read-only, so the handles stay invisible.
const hiddenHandle = "!size-1 !min-w-0 !border-0 !bg-transparent";

function SkillNode({ data, selected }: NodeProps<SkillNodeType>) {
  const { skill, tasks, done, status } = data.info;
  return (
    <div
      className={`flex w-52 cursor-pointer items-center gap-3 rounded-2xl border bg-surface-1 px-3 py-2.5 transition-[border,box-shadow] duration-200 ${
        status === "locked" ? "border-dashed border-line-strong text-muted" : status === "available" ? "border-line-strong" : "border-accent/50"
      } ${selected ? "shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent-from)_45%,transparent)]" : ""}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className={hiddenHandle} />
      <Ring value={done} max={tasks.length} size={36} stroke={4} label={`Progreso de ${skill.name}`}>
        {status === "done" ? <CircleCheck className="size-4 text-accent" /> : status === "locked" ? <Lock className="size-3 text-faint" /> : null}
      </Ring>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{skill.name}</p>
        <p className="text-[11px] text-faint tabular-nums">
          {STATUS_LABEL[status]} · {done}/{tasks.length}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={hiddenHandle} />
    </div>
  );
}

const nodeTypes = { skill: SkillNode };
const COLUMN_WIDTH = 240;
const ROW_HEIGHT = 100;

/** Rows by depth: requirements on top, what they unlock below. */
function buildGraph(infos: Map<string, SkillInfo>, selectedId: string | null) {
  const rows = new Map<number, SkillInfo[]>();
  for (const info of infos.values()) rows.set(info.level, [...(rows.get(info.level) ?? []), info]);

  const nodes: SkillNodeType[] = [...rows].flatMap(([level, row]) =>
    row.map((info, col) => ({
      id: info.skill.id,
      type: "skill" as const,
      position: { x: (col - (row.length - 1) / 2) * COLUMN_WIDTH, y: level * ROW_HEIGHT },
      data: { info },
      selected: info.skill.id === selectedId,
    })),
  );
  const edges: Edge[] = [...infos.values()].flatMap((info) =>
    info.skill.requires.map((req) => {
      const ready = infos.get(req)?.status === "done";
      return {
        id: `${req}->${info.skill.id}`,
        source: req,
        target: info.skill.id,
        animated: ready && info.status !== "done",
        style: { stroke: ready ? "var(--color-accent)" : "var(--color-line-strong)", strokeWidth: 2 },
      };
    }),
  );
  return { nodes, edges };
}

export function Skills() {
  const { roadmap, view } = useStore();
  const [theme] = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const infos = useMemo(() => skillInfos(roadmap, (id) => isDone(view, id)), [roadmap, view]);
  const { nodes, edges } = useMemo(() => buildGraph(infos, selectedId), [infos, selectedId]);
  const selected = selectedId ? infos.get(selectedId) : undefined;
  const mastered = [...infos.values()].filter((i) => i.status === "done").length;

  return (
    <Screen>
      <ScreenHeader title="Habilidades" subtitle={`${mastered} de ${infos.size} dominadas · cada habilidad se desbloquea al completar sus requisitos`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="h-[620px] overflow-hidden p-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            colorMode={theme}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            minZoom={0.4}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            preventScrolling={false}
            onNodeClick={(_, node) => setSelectedId(node.id === selectedId ? null : node.id)}
            onPaneClick={() => setSelectedId(null)}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </Card>

        <Card className="h-[620px] overflow-y-auto">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.skill.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{selected.skill.name}</h2>
                  <Pill tone={selected.status === "done" ? "accent" : "neutral"}>{STATUS_LABEL[selected.status]}</Pill>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{selected.skill.description}</p>
                {selected.skill.requires.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    Requiere:
                    {selected.skill.requires.map((id) => (
                      <button key={id} onClick={() => setSelectedId(id)} className="rounded-full border border-line px-2 py-0.5 hover:border-accent hover:text-ink">
                        {infos.get(id)?.skill.name}
                      </button>
                    ))}
                  </div>
                )}
                <h3 className="mt-5 mb-1 text-xs font-medium tracking-wide text-faint uppercase">
                  Tareas · {selected.done}/{selected.tasks.length}
                </h3>
                <ul className="-mx-2 space-y-0.5">
                  {selected.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} showStudy={false} />
                  ))}
                </ul>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid h-full place-items-center text-center">
                <p className="max-w-56 text-sm text-muted">Pulsa una habilidad del mapa para ver qué es, qué necesita y sus tareas.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </Screen>
  );
}
