// Shapes returned by the coach Tauri commands in src-tauri/src/lib.rs.

export type KeySource = "env" | "keyring";

export interface ApiKeyStatus {
  source: KeySource | null;
}

export interface Review {
  summary: string;
  advice: string;
  nextTaskIds: string[];
}

export interface Question {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Quiz {
  questions: Question[];
}
