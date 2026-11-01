import confetti from "canvas-confetti";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function accentColors(): string[] {
  const css = getComputedStyle(document.documentElement);
  return [css.getPropertyValue("--color-accent-from").trim(), css.getPropertyValue("--color-accent-to").trim(), "#ffffff"];
}

/** Confetti burst for achievements. Skipped entirely when the user prefers reduced motion. */
export function celebrate(kind: "badge" | "level" | "week") {
  if (reducedMotion()) return;
  const colors = accentColors();
  const base = { colors, disableForReducedMotion: true, zIndex: 60 };
  if (kind === "level") {
    confetti({ ...base, particleCount: 140, spread: 100, startVelocity: 45, origin: { y: 0.6 } });
    setTimeout(() => confetti({ ...base, particleCount: 80, spread: 120, origin: { y: 0.4 } }), 180);
  } else {
    confetti({ ...base, particleCount: kind === "week" ? 120 : 70, spread: 70, origin: { x: 0.85, y: 0.85 } });
  }
}
