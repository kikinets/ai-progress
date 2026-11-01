import { describe, expect, it } from "vitest";
import { formatClock, formatMinutes, heatmapLevel } from "./format";

describe("formatMinutes", () => {
  it("formats minutes and hours", () => {
    expect(formatMinutes(25)).toBe("25 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(95)).toBe("1 h 35 min");
    expect(formatMinutes(0)).toBe("0 min");
  });
});

describe("formatClock", () => {
  it("formats seconds as a clock", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3605)).toBe("1:00:05");
    expect(formatClock(0)).toBe("00:00");
  });
});

describe("heatmapLevel", () => {
  it("maps minutes to 5 levels relative to the busiest day", () => {
    expect(heatmapLevel(0, 120)).toBe(0);
    expect(heatmapLevel(120, 120)).toBe(4);
    expect(heatmapLevel(60, 120)).toBe(2);
    expect(heatmapLevel(1, 120)).toBe(1);
    expect(heatmapLevel(5, 0)).toBe(0);
  });
});
