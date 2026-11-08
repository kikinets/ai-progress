// Live timer derived from the active session in Rust plus the local clock.
// Rust only counts study time (pauses excluded); pomodoro breaks are a pause the UI manages.
import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { blockTransition, liveBreak, type BlockGuard } from "./pomodoro";
import { useStore } from "./store";

export const FOCUS_SECONDS = 25 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;
const LONG_BREAK_SECONDS = 15 * 60;
const BREAK_KEY = "pomodoro-break-ends-at";

export type TimerPhase = "idle" | "focus" | "paused" | "break";

export interface TimerState {
  phase: TimerPhase;
  /** Study seconds in this session. */
  elapsed: number;
  /** Seconds left in the current pomodoro focus block or break; null in free mode. */
  remaining: number | null;
  /** Completed focus blocks in this session. */
  blocks: number;
}

export const soundEnabled = () => {
  try {
    return localStorage.getItem("sound") !== "off";
  } catch {
    return true;
  }
};

function chime() {
  if (!soundEnabled()) return;
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch {
    // Audio is optional.
  }
}

async function notify(title: string, body: string) {
  chime();
  try {
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === "granted";
    if (granted) sendNotification({ title, body });
  } catch {
    // Notifications are optional; the timer keeps working without them.
  }
}

const readBreak = () => {
  try {
    return Number(localStorage.getItem(BREAK_KEY)) || 0;
  } catch {
    return 0;
  }
};
const writeBreak = (endsAt: number) => {
  try {
    if (endsAt) localStorage.setItem(BREAK_KEY, String(endsAt));
    else localStorage.removeItem(BREAK_KEY);
  } catch {
    // ignore
  }
};

type Timer = TimerState & { skipBreak: () => void };

// Runs once for the whole app, so the end of a block pauses the session exactly once.
function useTimerEngine(): Timer {
  const { view, viewAt, actions } = useStore();
  const [now, setNow] = useState(Date.now());
  const session = view.activeSession;
  // A break that ended while the app was closed is dropped silently.
  const [breakEndsAt, setBreakEndsAt] = useState(() => liveBreak(readBreak(), session, Date.now()));
  const guard = useRef<BlockGuard | null>(null);

  useEffect(() => {
    if (!session && !breakEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session, breakEndsAt]);

  const running = Boolean(session && !session.paused);
  // `now` can lag behind `viewAt` until the next tick; never count negative time.
  const elapsed = view.activeElapsedSeconds + (running ? Math.max(0, Math.floor((now - viewAt) / 1000)) : 0);
  const blocks = Math.floor(elapsed / FOCUS_SECONDS);

  // End of a focus block: pause the session and start a break. The guard is per session,
  // so restarting the app mid-block or starting a new session never fires by surprise.
  useEffect(() => {
    const next = blockTransition(guard.current, session, blocks);
    guard.current = next.guard;
    if (!next.fire) return;
    const breakSeconds = blocks % 4 === 0 ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS;
    const endsAt = Date.now() + breakSeconds * 1000;
    writeBreak(endsAt);
    setBreakEndsAt(endsAt);
    actions.pauseSession();
    notify("Pomodoro terminado", `Tómate ${breakSeconds / 60} minutos.`);
  }, [session, blocks, actions]);

  // End of a break.
  useEffect(() => {
    if (breakEndsAt && now >= breakEndsAt) {
      writeBreak(0);
      setBreakEndsAt(0);
      notify("Descanso terminado", "Cuando quieras, sigue con la sesión.");
    }
  }, [now, breakEndsAt]);

  // Resuming (by any means) or ending the session cancels the break without a notification.
  useEffect(() => {
    if (breakEndsAt && !session?.paused) {
      writeBreak(0);
      setBreakEndsAt(0);
    }
  }, [session, breakEndsAt]);

  const skipBreak = () => {
    writeBreak(0);
    setBreakEndsAt(0);
  };

  if (!session) return { phase: "idle", elapsed: 0, remaining: null, blocks: 0, skipBreak };
  if (breakEndsAt && session.paused) {
    return { phase: "break", elapsed, remaining: Math.max(0, Math.ceil((breakEndsAt - now) / 1000)), blocks, skipBreak };
  }
  return {
    phase: session.paused ? "paused" : "focus",
    elapsed,
    remaining: session.mode === "pomodoro" ? FOCUS_SECONDS - (elapsed % FOCUS_SECONDS) : null,
    blocks,
    skipBreak,
  };
}

const TimerContext = createContext<Timer | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  return createElement(TimerContext.Provider, { value: useTimerEngine() }, children);
}

export function useTimer(): Timer {
  const timer = useContext(TimerContext);
  if (!timer) throw new Error("useTimer outside TimerProvider");
  return timer;
}
