import { describe, expect, it } from "vitest";
import type { Roadmap } from "../types/roadmap";
import { skillInfos, skillLevels } from "./skills";

const roadmap: Roadmap = {
  version: 1,
  title: "Test",
  goal: "Test",
  skills: [
    { id: "a", name: "A", requires: [] },
    { id: "b", name: "B", requires: ["a"] },
    { id: "c", name: "C", requires: [] },
    { id: "d", name: "D", requires: ["b", "c"] },
  ],
  phases: [
    {
      id: "p",
      name: "P",
      start: null,
      end: null,
      weeks: [
        {
          id: "w",
          number: 1,
          title: "W",
          start: "2026-11-02",
          end: "2026-11-08",
          tasks: [
            { id: "t1", title: "T1", type: "concept", skills: ["a"] },
            { id: "t2", title: "T2", type: "practice", skills: ["a", "b"] },
            { id: "t3", title: "T3", type: "concept", skills: ["c"] },
            { id: "t4", title: "T4", type: "deliverable", skills: ["d"] },
          ],
        },
      ],
    },
  ],
};

describe("skillLevels", () => {
  it("places each skill one column after its deepest requirement", () => {
    const levels = skillLevels(roadmap.skills);
    expect(Object.fromEntries(levels)).toEqual({ a: 0, b: 1, c: 0, d: 2 });
  });
});

describe("skillInfos", () => {
  it("locks skills whose requirements are unfinished", () => {
    const infos = skillInfos(roadmap, {});
    expect(infos.get("a")?.status).toBe("available");
    expect(infos.get("b")?.status).toBe("locked");
    expect(infos.get("d")?.status).toBe("locked");
  });

  it("counts tasks that list the skill", () => {
    const infos = skillInfos(roadmap, { t1: "2026-11-02T10:00:00Z" });
    expect(infos.get("a")).toMatchObject({ done: 1, status: "in-progress" });
    expect(infos.get("a")?.tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("unlocks a skill once all its requirements are done", () => {
    const at = "2026-11-02T10:00:00Z";
    const infos = skillInfos(roadmap, { t1: at, t2: at, t3: at });
    expect(infos.get("a")?.status).toBe("done");
    expect(infos.get("b")?.status).toBe("done");
    expect(infos.get("d")?.status).toBe("available");
  });
});
