// Pure functions that derive the skill map from the roadmap and the user's progress.
import type { Roadmap, Skill, Task } from "../types/roadmap";

export type SkillStatus = "locked" | "available" | "in-progress" | "done";

export interface SkillInfo {
  skill: Skill;
  tasks: Task[];
  done: number;
  status: SkillStatus;
  /** Column in the map: 0 for skills with no requirements, then longest path from a root. */
  level: number;
}

function allTasks(roadmap: Roadmap): Task[] {
  return roadmap.phases.flatMap((p) => p.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks)));
}

/** Depth of each skill = 1 + deepest requirement. The roadmap is validated acyclic in Rust tests. */
export function skillLevels(skills: Skill[]): Map<string, number> {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const levels = new Map<string, number>();

  const levelOf = (id: string): number => {
    const known = levels.get(id);
    if (known !== undefined) return known;
    const reqs = byId.get(id)?.requires ?? [];
    const level = reqs.length === 0 ? 0 : 1 + Math.max(...reqs.map(levelOf));
    levels.set(id, level);
    return level;
  };

  skills.forEach((s) => levelOf(s.id));
  return levels;
}

export function skillInfos(roadmap: Roadmap, isDone: (taskId: string) => boolean): Map<string, SkillInfo> {
  const tasks = allTasks(roadmap);
  const levels = skillLevels(roadmap.skills);
  const infos = new Map<string, SkillInfo>();

  for (const skill of roadmap.skills) {
    const skillTasks = tasks.filter((t) => t.skills.includes(skill.id));
    const done = skillTasks.filter((t) => isDone(t.id)).length;
    infos.set(skill.id, {
      skill,
      tasks: skillTasks,
      done,
      status: done > 0 ? (done === skillTasks.length ? "done" : "in-progress") : "available",
      level: levels.get(skill.id) ?? 0,
    });
  }

  // A skill nobody has started is locked while any requirement is unfinished.
  for (const info of infos.values()) {
    if (info.status !== "available") continue;
    const blocked = info.skill.requires.some((id) => infos.get(id)?.status !== "done");
    if (blocked) info.status = "locked";
  }

  return infos;
}
