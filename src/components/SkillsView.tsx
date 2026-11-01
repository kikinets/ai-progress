import { useMemo, useState } from "react";
import { skillInfos } from "../lib/skills";
import type { Roadmap, Task } from "../types/roadmap";
import { SkillMap } from "./SkillMap";
import { SkillPanel } from "./SkillPanel";

interface Props {
  roadmap: Roadmap;
  completed: Record<string, string>;
  onToggle: (task: Task) => void;
}

export function SkillsView({ roadmap, completed, onToggle }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const infos = useMemo(() => skillInfos(roadmap, completed), [roadmap, completed]);

  return (
    <>
      <SkillMap infos={infos} selectedId={selectedId} onSelect={setSelectedId} />
      <SkillPanel
        info={selectedId ? infos.get(selectedId) : undefined}
        infos={infos}
        completed={completed}
        onSelect={setSelectedId}
        onToggle={onToggle}
      />
    </>
  );
}
