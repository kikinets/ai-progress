# AI Progress

A desktop app to track my AI engineering learning path: an interactive study roadmap, tasks I check off, a study streak and, later on, an AI coach that reads my progress and quizzes me.

It is also my first serious project built with an AI coding agent (Claude Code), so part of the goal is learning how to work well with one.

## Status

**Phase 0: bootstrap (done).** The app loads the study roadmap from the Rust core and renders its phases, weeks and tasks as a read-only list.

| Phase | Scope |
| --- | --- |
| 0 | Project setup, roadmap loading from Rust ✅ |
| 1 | Check off tasks, persist progress, study streak |
| 2 | Skill map (dependency graph) with React Flow |
| 3 | AI coach that reviews progress and quizzes me |

## Stack

- [Tauri 2](https://tauri.app/): Rust core, web UI
- React + TypeScript + Vite
- Tailwind CSS v4, light and dark themes
- [Motion](https://motion.dev/) for animations, respecting `prefers-reduced-motion`

## Architecture

- The UI only renders and animates. File access and external API calls always go through the Rust core via Tauri commands.
- `data/roadmap.json` is read-only seed data: skills with prerequisites, phases, weeks and tasks, each with a stable `id`.
- User progress will live in a separate `progress.json` that references tasks by `id`, never by title.

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
| `cargo check --manifest-path src-tauri/Cargo.toml` | Check the Rust core |
