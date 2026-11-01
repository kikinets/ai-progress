import { describe, expect, it } from "vitest";
import type { Roadmap, Task } from "../types/roadmap";
import { skillInfos, skillLevels } from "./skills";

const task = (id: string, type: Task["type"], skills: string[]): Task => ({
  id, title: id.toUpperCase(), type, skills, estimateMinutes: 30, description: "", why: "", resources: [], subtasks: [], doneWhen: "x",
});

const roadmap: Roadmap = {
  version: 2,
  title: "Test",
  goal: "Test",
  dailyTargetMinutes: 150,
  skills: [
    { id: "a", name: "A", description: "", requires: [] },
    { id: "b", name: "B", description: "", requires: ["a"] },
    { id: "c", name: "C", description: "", requires: [] },
    { id: "d", name: "D", description: "", requires: ["b", "c"] },
  ],
  phases: [
    {
      id: "p", name: "P", start: null, end: null, note: null,
      weeks: [
        {
          id: "w", number: 1, title: "W", goal: "", start: "2026-11-02", end: "2026-11-08",
          days: [
            { date: "2026-11-02", title: "D1", kind: "study", tasks: [task("t1", "concept", ["a"]), task("t2", "practice", ["a", "b"])] },
            { date: "2026-11-03", title: "D2", kind: "study", tasks: [task("t3", "concept", ["c"]), task("t4", "deliverable", ["d"])] },
          ],
        },
      ],
    },
  ],
};

const doneSet = (...ids: string[]) => (id: string) => ids.includes(id);

describe("skillLevels", () => {
  it("places each skill one column after its deepest requirement", () => {
    const levels = skillLevels(roadmap.skills);
    expect(Object.fromEntries(levels)).toEqual({ a: 0, b: 1, c: 0, d: 2 });
  });
});

describe("skillInfos", () => {
  it("locks skills whose requirements are unfinished", () => {
    const infos = skillInfos(roadmap, doneSet());
    expect(infos.get("a")?.status).toBe("available");
    expect(infos.get("b")?.status).toBe("locked");
    expect(infos.get("d")?.status).toBe("locked");
  });

  it("counts tasks that list the skill", () => {
    const infos = skillInfos(roadmap, doneSet("t1"));
    expect(infos.get("a")).toMatchObject({ done: 1, status: "in-progress" });
    expect(infos.get("a")?.tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("unlocks a skill once all its requirements are done", () => {
    const infos = skillInfos(roadmap, doneSet("t1", "t2", "t3"));
    expect(infos.get("a")?.status).toBe("done");
    expect(infos.get("b")?.status).toBe("done");
    expect(infos.get("d")?.status).toBe("available");
  });
});
