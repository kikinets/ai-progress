import { describe, expect, it } from "vitest";
import { BADGE_IDS, BADGE_INFO } from "./badges";

describe("BADGE_INFO", () => {
  it("covers exactly the 15 badges defined in Rust, in order", () => {
    expect(BADGE_IDS).toEqual([
      "first-step", "first-deliverable", "streak-3", "streak-7", "streak-14",
      "focus-1h", "focus-10h", "focus-25h", "marathon", "deep-work",
      "early-bird", "night-owl", "week-complete", "skill-mastered", "note-taker",
    ]);
    expect(Object.keys(BADGE_INFO).sort()).toEqual([...BADGE_IDS].sort());
  });
});
