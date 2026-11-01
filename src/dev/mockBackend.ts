// Dev-only stand-in for the Rust commands, so every screen can be reviewed in a plain browser.
// It approximates the real rules; the source of truth is src-tauri/src/progress.
import { mockIPC } from "@tauri-apps/api/mocks";
import roadmapJson from "../../data/roadmap.json";
import { BADGE_IDS } from "../lib/badges";
import { toIso } from "../lib/dates";
import type { ActiveSession, BadgeView, DayStat, ProgressUpdate, ProgressView, TaskProgress, TimerMode } from "../types/progress";
import type { Roadmap } from "../types/roadmap";

const roadmap = roadmapJson as unknown as Roadmap;
const allTasks = roadmap.phases.flatMap((p) => p.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks)));

interface Session {
  taskId: string;
  start: string;
  minutes: number;
}

const daysAgo = (n: number, hour = 18) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// Fixture: a few weeks of study history and the first tasks done.
const tasks: Record<string, TaskProgress> = {};
allTasks.slice(0, 6).forEach((t, i) => {
  tasks[t.id] = {
    completedAt: daysAgo(6 - i).toISOString(),
    subtasks: Object.fromEntries(t.subtasks.map((s) => [s.id, daysAgo(6 - i).toISOString()])),
    notes: i === 1 ? "## venv vs uv\n\n- `uv` es **mucho** más rápido\n- `uv add requests`" : "",
  };
});
tasks[allTasks[6].id] = { completedAt: null, subtasks: { [allTasks[6].subtasks[0].id]: daysAgo(0).toISOString() }, notes: "" };

const sessions: Session[] = [];
for (let ago = 40; ago >= 1; ago--) {
  if (ago % 5 === 3 || (ago > 20 && ago % 3 === 0)) continue;
  sessions.push({ taskId: allTasks[ago % 8].id, start: daysAgo(ago, ago % 7 === 0 ? 7 : 19).toISOString(), minutes: 25 + ((ago * 37) % 110) });
}
sessions.push({ taskId: allTasks[6].id, start: daysAgo(0, 9).toISOString(), minutes: 50 });

let active: ActiveSession | null = null;
const badges: Record<string, string> = {
  "first-step": daysAgo(6).toISOString(),
  "focus-1h": daysAgo(38).toISOString(),
  "focus-10h": daysAgo(20).toISOString(),
  "streak-3": daysAgo(10).toISOString(),
  "early-bird": daysAgo(35).toISOString(),
};

function elapsed(a: ActiveSession): number {
  const running = a.segmentStart ? Math.floor((Date.now() - Date.parse(a.segmentStart)) / 1000) : 0;
  return a.accumulatedSeconds + running;
}

function view(): ProgressView {
  const today = toIso(new Date());
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(toIso(new Date(s.start)), (byDay.get(toIso(new Date(s.start))) ?? 0) + s.minutes);
  const doneByDay = new Map<string, number>();
  for (const t of Object.values(tasks)) if (t.completedAt) doneByDay.set(toIso(new Date(t.completedAt)), (doneByDay.get(toIso(new Date(t.completedAt))) ?? 0) + 1);

  const minutesByDay: DayStat[] = [];
  for (let ago = 83; ago >= 0; ago--) {
    const date = toIso(daysAgo(ago));
    minutesByDay.push({ date, minutes: byDay.get(date) ?? 0, tasksDone: doneByDay.get(date) ?? 0 });
  }
  const monday = daysAgo((new Date().getDay() + 6) % 7);
  const weekMinutes = minutesByDay.filter((d) => d.date >= toIso(monday)).reduce((s, d) => s + d.minutes, 0);
  const minutesByTask: Record<string, number> = {};
  for (const s of sessions) minutesByTask[s.taskId] = (minutesByTask[s.taskId] ?? 0) + s.minutes;

  let current = 0;
  for (let ago = byDay.has(today) ? 0 : 1; byDay.has(toIso(daysAgo(ago))); ago++) current++;

  const xpTotal =
    Object.entries(tasks).reduce((sum, [id, t]) => {
      const type = allTasks.find((x) => x.id === id)?.type;
      const done = t.completedAt ? (type === "deliverable" ? 80 : type === "review" ? 30 : 20) : 0;
      return sum + done + Object.keys(t.subtasks).length * 5;
    }, 0) + sessions.reduce((s, x) => s + Math.floor(x.minutes / 5), 0);
  let level = 1;
  let left = xpTotal;
  while (left >= 100 * level) left -= 100 * level++;

  const total = sessions.reduce((s, x) => s + x.minutes, 0);
  const progressFor: Record<string, [number, number]> = {
    "first-step": [Math.min(1, Object.values(tasks).filter((t) => t.completedAt).length), 1],
    "first-deliverable": [0, 1],
    "streak-3": [3, 3],
    "streak-7": [Math.min(7, Math.max(current, 4)), 7],
    "streak-14": [Math.max(current, 4), 14],
    "focus-1h": [60, 60],
    "focus-10h": [600, 600],
    "focus-25h": [Math.min(1500, total), 1500],
    marathon: [Math.min(180, Math.max(...byDay.values())), 180],
    "deep-work": [Math.min(90, Math.max(...sessions.map((s) => s.minutes))), 90],
    "early-bird": [1, 1],
    "night-owl": [0, 1],
    "week-complete": [6, 14],
    "skill-mastered": [4, 7],
    "note-taker": [Object.values(tasks).filter((t) => t.notes.trim()).length, 5],
  };
  const badgeViews: BadgeView[] = BADGE_IDS.map((id) => ({ id, unlockedAt: badges[id] ?? null, progress: progressFor[id][0], target: progressFor[id][1] }));

  return {
    tasks: structuredClone(tasks),
    activeSession: active ? { ...active } : null,
    activeElapsedSeconds: active ? elapsed(active) : 0,
    notice: null,
    streak: { current, longest: Math.max(current, 9), studiedToday: byDay.has(today) },
    stats: {
      todayMinutes: byDay.get(today) ?? 0,
      weekMinutes,
      weekTargetMinutes: roadmap.dailyTargetMinutes * 6,
      totalMinutes: total,
      minutesByDay,
      minutesByTask,
    },
    xp: { total: xpTotal, level, xpIntoLevel: left, xpForNextLevel: 100 * level },
    badges: badgeViews,
  };
}

function update(newBadges: string[] = []): ProgressUpdate {
  const before = view().xp.level;
  for (const id of newBadges) badges[id] = new Date().toISOString();
  const v = view();
  return { view: v, newBadges, levelUp: v.xp.level > before ? v.xp.level : null };
}

type Args = Record<string, unknown>;

export function installMockBackend() {
  mockIPC((cmd, payload) => {
    const args = (payload ?? {}) as Args;
    const entry = (id: string) => (tasks[id] ??= { completedAt: null, subtasks: {}, notes: "" });
    switch (cmd) {
      case "load_roadmap":
        return roadmap;
      case "load_progress":
        return view();
      case "set_task_done": {
        const t = entry(args.taskId as string);
        const before = view().xp.level;
        t.completedAt = args.done ? (t.completedAt ?? new Date().toISOString()) : null;
        const isDeliverable = allTasks.find((x) => x.id === args.taskId)?.type === "deliverable";
        const fresh = args.done && isDeliverable && !badges["first-deliverable"] ? ["first-deliverable"] : [];
        const u = update(fresh);
        return { ...u, levelUp: u.view.xp.level > before ? u.view.xp.level : null };
      }
      case "set_subtask_done": {
        const t = entry(args.taskId as string);
        if (args.done) t.subtasks[args.subtaskId as string] = new Date().toISOString();
        else delete t.subtasks[args.subtaskId as string];
        return update();
      }
      case "save_notes":
        entry(args.taskId as string).notes = args.notes as string;
        return update(Object.values(tasks).filter((t) => t.notes.trim()).length >= 5 && !badges["note-taker"] ? ["note-taker"] : []);
      case "start_session":
        if (active) throw "ya hay una sesión activa";
        active = { taskId: args.taskId as string, mode: args.mode as TimerMode, startedAt: new Date().toISOString(), segmentStart: new Date().toISOString(), accumulatedSeconds: 0, paused: false };
        return update();
      case "pause_session":
        if (!active || active.paused) throw "la sesión ya está en pausa";
        active.accumulatedSeconds = elapsed(active);
        active.segmentStart = null;
        active.paused = true;
        return update();
      case "resume_session":
        if (!active || !active.paused) throw "la sesión no está en pausa";
        active.segmentStart = new Date().toISOString();
        active.paused = false;
        return update();
      case "stop_session": {
        if (!active) throw "no hay ninguna sesión activa";
        const seconds = elapsed(active);
        if (seconds >= 60) sessions.push({ taskId: active.taskId, start: active.startedAt, minutes: Math.floor(seconds / 60) });
        active = null;
        return update();
      }
      case "api_key_status":
        return { source: null };
      case "copy_review_prompt":
      case "copy_quiz_prompt":
        return null;
      default:
        // Plugins (opener, notification) and anything else: no-op in the browser.
        if (cmd.startsWith("plugin:notification|is_permission_granted")) return true;
        return null;
    }
  });
}
