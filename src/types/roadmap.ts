// Shape of data/roadmap.json v2, as returned by the `load_roadmap` Tauri command (roadmap.rs).

export type TaskType = "concept" | "practice" | "deliverable" | "review";
export type ResourceKind = "doc" | "video" | "course" | "article" | "practice";
export type DayKind = "study" | "review";

export interface Resource {
  title: string;
  url: string;
  kind: ResourceKind;
}

export interface Subtask {
  id: string;
  title: string;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  skills: string[];
  estimateMinutes: number;
  description: string;
  why: string;
  resources: Resource[];
  subtasks: Subtask[];
  doneWhen: string;
}

export interface Day {
  date: string;
  title: string;
  kind: DayKind;
  tasks: Task[];
}

export interface Week {
  id: string;
  number: number;
  title: string;
  goal: string;
  start: string;
  end: string;
  days: Day[];
}

export interface Phase {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
  note: string | null;
  weeks: Week[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  requires: string[];
}

export interface Roadmap {
  version: number;
  title: string;
  goal: string;
  dailyTargetMinutes: number;
  skills: Skill[];
  phases: Phase[];
}
