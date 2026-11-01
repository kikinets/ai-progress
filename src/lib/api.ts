// Typed wrappers around the Tauri commands defined in src-tauri/src/lib.rs.
import { invoke } from "@tauri-apps/api/core";
import type { ApiKeyStatus, Quiz, Review } from "../types/coach";
import type { Progress } from "../types/progress";
import type { Roadmap } from "../types/roadmap";

export const loadRoadmap = () => invoke<Roadmap>("load_roadmap");

export const loadProgress = () => invoke<Progress>("load_progress");

export const setTaskDone = (taskId: string, done: boolean) =>
  invoke<Progress>("set_task_done", { taskId, done });

export const apiKeyStatus = () => invoke<ApiKeyStatus>("api_key_status");

export const setApiKey = (key: string) => invoke<void>("set_api_key", { key });

export const deleteApiKey = () => invoke<void>("delete_api_key");

export const coachReview = () => invoke<Review>("coach_review");

export const coachQuiz = (skillId: string) => invoke<Quiz>("coach_quiz", { skillId });
