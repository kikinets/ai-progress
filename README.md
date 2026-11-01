# AI Progress

A desktop app to track my AI engineering learning path: an interactive study roadmap, tasks I check off, a study streak and, later on, an AI coach that reads my progress and quizzes me.

It is also my first serious project built with an AI coding agent (Claude Code), so part of the goal is learning how to work well with one.

## Status

**Phase 2: skill map (done).** Tasks can be checked off; progress is saved to disk by the Rust core, and the app shows overall and weekly progress plus a daily study streak. A second tab shows the skill dependency graph, with each skill locked, available, in progress or done, and its tasks one click away.

| Phase | Scope |
| --- | --- |
| 0 | Project setup, roadmap loading from Rust ✅ |
| 1 | Check off tasks, persist progress, study streak ✅ |
| 2 | Skill map (dependency graph) with React Flow ✅ |
| 3 | AI coach that reviews progress and quizzes me |

## Stack

- [Tauri 2](https://tauri.app/): Rust core, web UI
- React + TypeScript + Vite
- Tailwind CSS v4, light and dark themes
- [Motion](https://motion.dev/) for animations, respecting `prefers-reduced-motion`
- [React Flow](https://reactflow.dev/) for the skill map
- Vitest (UI logic) and `cargo test` (Rust core)

## Architecture

- The UI only renders and animates. File access and external API calls always go through the Rust core via Tauri commands.
- `data/roadmap.json` is read-only seed data: skills with prerequisites, phases, weeks and tasks, each with a stable `id`.
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
| `npm run build` | Type-check and build the UI only |
| `npm run tauri build` | Build the desktop installer |
| `npm test` | Run the UI logic tests |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run the Rust core tests |
