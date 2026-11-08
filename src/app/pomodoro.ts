// Pure pomodoro rules, kept out of React so they can be tested.
import type { TimerMode } from "../types/progress";

interface SessionLike {
  startedAt: string;
  mode: TimerMode;
  paused: boolean;
}

/** The last focus block already handled, per session. */
export interface BlockGuard {
  startedAt: string;
  block: number;
}

/**
 * Decides whether a focus block just ended. A session seen for the first time (new session,
 * or the app restarted mid-session) only records where it is, so no break fires by surprise.
 */
export function blockTransition(guard: BlockGuard | null, session: SessionLike | null, blocks: number): { fire: boolean; guard: BlockGuard | null } {
  if (!session || session.mode !== "pomodoro") return { fire: false, guard: null };
  if (!guard || guard.startedAt !== session.startedAt) {
    return { fire: false, guard: { startedAt: session.startedAt, block: blocks } };
  }
  if (!session.paused && blocks > guard.block) return { fire: true, guard: { ...guard, block: blocks } };
  return { fire: false, guard };
}

/** A stored break only counts while its session is still paused and it has not ended. */
export function liveBreak(endsAt: number, session: SessionLike | null, now: number): number {
  return endsAt > now && session?.paused ? endsAt : 0;
}
