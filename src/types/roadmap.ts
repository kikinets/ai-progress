// Shape of data/roadmap.json, as returned by the `load_roadmap` Tauri command.

export type TaskType = "concept" | "practice" | "deliverable";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  skills: string[];
}

export interface Week {
  id: string;
  number: number;
  title: string;
  start: string;
  end: string;
  tasks: Task[];
}

export interface Phase {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
  note?: string;
  weeks: Week[];
}

export interface Skill {
  id: string;
  name: string;
  requires: string[];
}

export interface Roadmap {
  version: number;
  title: string;
  goal: string;
  skills: Skill[];
  phases: Phase[];
}
