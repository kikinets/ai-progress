# AI Progress

A polished dark desktop app to track my AI engineering learning path: a day-by-day study plan, a study timer, XP, levels and badges, a skill map and an AI coach that reviews my progress and quizzes me.

It is also my first serious project built with an AI coding agent (Claude Code), so part of the goal is learning how to work ## Features (v2)

- **Today**: what to study today (plus overdue tasks), a Pomodoro / free study timer, streak, weekly minutes vs target, level, a 12-week activity heatmap and the next milestone.
- **Plan**: a 4-week, day-by-day plan (50 tasks, 173 subtasks, ~150 min/day). Each task opens a side panel with what to do, why it matters, real free resources, subtasks, a "done when" criterion, time studied vs estimated and Markdown notes that save themselves.
- **Study timer**: Pomodoro (25/5, long break every 4) or free mode, always tied to a task. The session lives in the Rust core, so it survives closing the app; forgotten sessions are capped at 4 h. System notification when a block ends.
- **Achievements**: XP for subtasks, tasks, reviews, deliverables and study minutes; levels; 15 badges with progress and confetti when they unlock.
- **Skills**: dependency graph of skills (React Flow), each locked, available, in progress or done.
- **Coach**: free by default (copies a prompt with your progress and opens claude.ai); optional in-app answers through the Anthropic API.
- Command palette (`Ctrl+K`), shortcuts (`1`-`5` sections, `Space` pause/resume), light and dark themes, reduced-motion support.

Design and plan: [`docs/superpowers/specs/2026-11-01-redesign-design.md`](docs/superpowers/specs/2026-11-01-redesign-design.md).

quizzes me ✅ |

## Stack

- [Tauri 2](https://tauri.app/): Rust core, web UI
- React + TypeScript + Vite
- Tailwind CSS v4, light and dark themes
- [Motion](https://motion.dev/) for animations, respecting `prefers-reduced-motion`
- [React Flow](https://reactflow.dev/) for the skill map
- [Claude API](https://docs.claude.com/) (`claude-opus-5-5`, structured JSON output) for the coach, called from Rust with `reqwest`
- Radix (dialogs, tooltips), cmdk (command palette), lucide icons, canvas-confetti, Geist font
- Vitest (UI logic) and `cargo test` (Rust core)

## Architecture

- The UI only renders and animates. File access and external API calls always go through the Rust core via Tauri commands.
- `data/roadmap.json` (v2) is read-only seed data: skills with prerequisites, phases, weeks, days and tasks with resources and subtasks, each with a stable `id`. Rust validates it in tests.
- All domain logic (streak, stats, timer sessions, XP, levels, badges) lives in Rust and is unit tested; v1 progress files are migrated automatically with a backup.
- The Anthropic API key is stored in the OS credential store (or read from `ANTHROPIC_API_KEY`), never in files or in git. The UI never sees it.
- User progress lives in a separate `progress.json` in the OS app data folder (not in the repo). It references tasks by `id`, never by title, and is written atomically.

```
data/        roadmap.json (study plan)
docs/        SPEC.md, ROADMAP.md
src/         React UI
src-tauri/   Rust core (Tauri commands)
```

## Getting started

Prerequisites: [Node.js](https://nodejs.org/) 20+, [Rust](https://rustup.rs/) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```bash
npm install
npm run tauri dev
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | UI only in a browser, with a mock backend (no Rust needed) |
| `npm run build` | Type-check and build the UI only |
| `npm run tauri build` | Build the desktop installer |
| `npm test` | Run the UI logic tests |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run the Rust core tests |
