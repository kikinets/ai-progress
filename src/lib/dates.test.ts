import { describe, expect, it } from "vitest";
import { greeting, longDate, shortRange, weekdayShort } from "./dates";

describe("greeting", () => {
  it("depends on the hour", () => {
    expect(greeting(5)).toBe("Buenas noches");
    expect(greeting(6)).toBe("Buenos días");
    expect(greeting(11)).toBe("Buenos días");
    expect(greeting(12)).toBe("Buenas tardes");
    expect(greeting(19)).toBe("Buenas tardes");
    expect(greeting(20)).toBe("Buenas noches");
  });
});

describe("date labels", () => {
  it("formats in Spanish from ISO dates", () => {
    expect(longDate("2026-11-02")).toBe("lunes 2 de noviembre");
    expect(shortRange("2026-11-02", "2026-11-08")).toBe("2 – 8 nov");
    expect(shortRange("2026-11-30", "2026-12-06")).toBe("30 nov – 6 dic");
    expect(weekdayShort("2026-11-02")).toBe("L");
  });
});
