// Typed wrappers around the Tauri commands defined in src-tauri/src/lib.rs.
import { invoke } from "@tauri-apps/api/core";
import type { ApiKeyStatus, Quiz, Review } from "../types/coach";
import type { ProgressUpdate, ProgressView, TimerMode } from "../types/progress";
import type { Roadmap } from "../types/roadmap";

export const loadRoadmap = () => invoke<Roadmap>("load_roadmap");
export const loadProgress = () => invoke<ProgressView>("load_progress");

export const setTaskDone = (taskId: string, done: boolean) =>
  invoke<ProgressUpdate>("set_task_done", { taskId, done });
export const setSubtaskDone = (taskId: string, subtaskId: string, done: boolean) =>
  invoke<ProgressUpdate>("set_subtask_done", { taskId, subtaskId, done });
export const saveNotes = (taskId: string, notes: string) => invoke<ProgressUpdate>("save_notes", { taskId, notes });

export const startSession = (taskId: string, mode: TimerMode) =>
  invoke<ProgressUpdate>("start_session", { taskId, mode });
export const pauseSession = () => invoke<ProgressUpdate>("pause_session");
export const resumeSession = () => invoke<ProgressUpdate>("resume_session");
export const stopSession = () => invoke<ProgressUpdate>("stop_session");

export const apiKeyStatus = () => invoke<ApiKeyStatus>("api_key_status");
export const setApiKey = (key: string) => invoke<void>("set_api_key", { key });
export const deleteApiKey = () => invoke<void>("delete_api_key");

/** Rust builds the coach prompt and puts it on the clipboard. */
export const copyReviewPrompt = () => invoke<void>("copy_review_prompt");
export const copyQuizPrompt = (skillId: string) => invoke<void>("copy_quiz_prompt", { skillId });
export const coachReview = () => invoke<Review>("coach_review");
export const coachQuiz = (skillId: string) => invoke<Quiz>("coach_quiz", { skillId });
