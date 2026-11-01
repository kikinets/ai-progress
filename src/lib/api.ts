// Typed wrappers around the Tauri commands defined in src-tauri/src/lib.rs.
import { invoke } from "@tauri-apps/api/core";
import type { Progress } from "../types/progress";
import type { Roadmap } from "../types/roadmap";

export const loadRoadmap = () => invoke<Roadmap>("load_roadmap");

export const loadProgress = () => invoke<Progress>("load_progress");

export const setTaskDone = (taskId: string, done: boolean) =>
  invoke<Progress>("set_task_done", { taskId, done });
