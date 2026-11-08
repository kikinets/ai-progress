import { describe, expect, it } from "vitest";
import { blockTransition, liveBreak } from "./pomodoro";

const session = (startedAt: string, paused = false) => ({ startedAt, mode: "pomodoro" as const, paused });

describe("blockTransition", () => {
  it("does not fire when a session is first seen mid-block (app restart)", () => {
    const r = blockTransition(null, session("s1"), 1);
    expect(r.fire).toBe(false);
    expect(r.guard).toEqual({ startedAt: "s1", block: 1 });
  });

  it("fires once when a block ends within the same session", () => {
    const first = blockTransition({ startedAt: "s1", block: 0 }, session("s1"), 1);
    expect(first.fire).toBe(true);
    expect(blockTransition(first.guard, session("s1"), 1).fire).toBe(false);
  });

  it("fires for the first block of a later session", () => {
    const later = blockTransition({ startedAt: "s1", block: 1 }, session("s2"), 0);
    expect(later.fire).toBe(false);
    expect(blockTransition(later.guard, session("s2"), 1).fire).toBe(true);
  });

  it("never fires while paused or in free mode", () => {
    expect(blockTransition({ startedAt: "s1", block: 0 }, session("s1", true), 1).fire).toBe(false);
    expect(blockTransition({ startedAt: "s1", block: 0 }, { startedAt: "s1", mode: "free", paused: false }, 1).fire).toBe(false);
  });
});

describe("liveBreak", () => {
  it("drops a break that already ended or whose session is running again", () => {
    expect(liveBreak(1000, session("s1", true), 2000)).toBe(0);
    expect(liveBreak(5000, session("s1", false), 2000)).toBe(0);
    expect(liveBreak(5000, null, 2000)).toBe(0);
    expect(liveBreak(5000, session("s1", true), 2000)).toBe(5000);
  });
});
