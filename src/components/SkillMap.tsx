import { useMemo } from "react";
import { Background, Controls, ReactFlow, type Edge } from "@xyflow/react";
import type { SkillInfo } from "../lib/skills";
import { SkillNode, type SkillNodeType } from "./SkillNode";

// Defined outside the component so React Flow does not re-create node types on every render.
const nodeTypes = { skill: SkillNode };

const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 96;

interface Props {
  infos: Map<string, SkillInfo>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** Lays skills out in rows by depth: requirements on top, what they unlock below. */
function buildGraph(infos: Map<string, SkillInfo>, selectedId: string | null) {
  const rows = new Map<number, SkillInfo[]>();
  for (const info of infos.values()) {
    rows.set(info.level, [...(rows.get(info.level) ?? []), info]);
  }

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
    info.skill.requires.map((req) => ({
      id: `${req}->${info.skill.id}`,
      source: req,
      target: info.skill.id,
      style: {
        stroke: infos.get(req)?.status === "done" ? "var(--color-accent)" : "var(--color-muted)",
        strokeWidth: 2,
        transition: "stroke 200ms",
      },
    })),
  );

  return { nodes, edges };
}

export function SkillMap({ infos, selectedId, onSelect }: Props) {
  const { nodes, edges } = useMemo(() => buildGraph(infos, selectedId), [infos, selectedId]);

  return (
    <div className="h-[560px] overflow-hidden rounded-lg border border-line">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="system"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        // The wheel scrolls the page; zoom stays on the controls and pinch.
        zoomOnScroll={false}
        preventScrolling={false}
        onNodeClick={(_, node) => onSelect(node.id === selectedId ? null : node.id)}
        onPaneClick={() => onSelect(null)}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
