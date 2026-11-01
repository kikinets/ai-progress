// progress.json v2: what the user has done. Loaded once, kept in memory, saved on every change.

use std::{collections::BTreeMap, fs, path::PathBuf};

use chrono::{DateTime, Local, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

const CURRENT_VERSION: u32 = 2;

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TaskProgress {
    pub completed_at: Option<DateTime<Utc>>,
    /// Subtask id -> when it was completed.
    pub subtasks: BTreeMap<String, DateTime<Utc>>,
    pub notes: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TimerMode {
    Pomodoro,
    Free,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub task_id: String,
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub minutes: u32,
    pub mode: TimerMode,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveSession {
    pub task_id: String,
    pub mode: TimerMode,
    pub started_at: DateTime<Utc>,
    /// Start of the running stretch; None while paused.
    pub segment_start: Option<DateTime<Utc>>,
    /// Seconds from stretches that already ended (pauses split a session into stretches).
    pub accumulated_seconds: u64,
    pub paused: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Progress {
    pub version: u32,
    pub tasks: BTreeMap<String, TaskProgress>,
    pub sessions: Vec<Session>,
    pub active_session: Option<ActiveSession>,
    /// Badge id -> when it was unlocked. Unlocked badges are never removed.
    pub badges: BTreeMap<String, DateTime<Utc>>,
}

impl Default for Progress {
    fn default() -> Self {
        Self {
            version: CURRENT_VERSION,
            tasks: BTreeMap::new(),
            sessions: Vec::new(),
            active_session: None,
            badges: BTreeMap::new(),
        }
    }
}

/// Turns any supported progress.json into the current shape.
fn migrate(value: Value) -> Result<Progress, String> {
    match value["version"].as_u64() {
        Some(2) => serde_json::from_value(value).map_err(|e| e.to_string()),
        // v1 only stored task id -> completion time.
        Some(1) | None => {
            let completed: BTreeMap<String, DateTime<Utc>> =
                serde_json::from_value(value["completed"].clone()).unwrap_or_default();
            let tasks = completed
                .into_iter()
                .map(|(id, at)| (id, TaskProgress { completed_at: Some(at), ..Default::default() }))
                .collect();
            Ok(Progress { tasks, ..Default::default() })
        }
        Some(v) => Err(format!("unsupported progress version {v}")),
    }
}

pub struct ProgressStore {
    path: PathBuf,
    data: Progress,
}

impl ProgressStore {
    pub fn open(path: PathBuf) -> Self {
        let Ok(text) = fs::read_to_string(&path) else {
            return Self { path, data: Progress::default() };
        };

        let parsed = serde_json::from_str::<Value>(&text).map_err(|e| e.to_string());
        let is_current = parsed.as_ref().is_ok_and(|v| v["version"] == CURRENT_VERSION);
        match parsed.and_then(migrate) {
            Ok(data) => {
                let store = Self { path, data };
                if !is_current {
                    // Keep the original before rewriting it in the new format.
                    let backup = store.path.with_file_name("progress.v1.backup.json");
                    if fs::write(&backup, &text).is_ok()
                        && let Err(e) = store.save(&store.data)
                    {
                        eprintln!("could not save migrated progress: {e}");
                    }
                }
                store
            }
            Err(e) => {
                // Keep the broken file for inspection instead of overwriting it.
                let stamp = Local::now().format("%Y%m%d-%H%M%S");
                let aside = path.with_file_name(format!("progress.corrupt-{stamp}.json"));
                eprintln!("progress.json is invalid ({e}); moved to {}", aside.display());
                let _ = fs::rename(&path, &aside);
                Self { path, data: Progress::default() }
            }
        }
    }

    pub fn data(&self) -> &Progress {
        &self.data
    }

    /// Applies `f` to a copy, saves it, and only then makes it current,
    /// so memory and disk always agree.
    pub fn update<T>(&mut self, f: impl FnOnce(&mut Progress) -> Result<T, String>) -> Result<T, String> {
        let mut next = self.data.clone();
        let result = f(&mut next)?;
        self.save(&next).map_err(|e| format!("no se pudo guardar el progreso: {e}"))?;
        self.data = next;
        Ok(result)
    }

    /// Writes to a temporary file and renames it, so a crash never leaves a half-written file.
    fn save(&self, data: &Progress) -> std::io::Result<()> {
        if let Some(dir) = self.path.parent() {
            fs::create_dir_all(dir)?;
        }
        let tmp = self.path.with_extension("json.tmp");
        fs::write(&tmp, serde_json::to_string_pretty(data)?)?;
        fs::rename(&tmp, &self.path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("ai-progress-store-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn at(s: &str) -> DateTime<Utc> {
        s.parse().unwrap()
    }

    const V1: &str = r#"{ "version": 1, "completed": { "w1-setup": "2026-11-02T10:00:00Z" } }"#;

    #[test]
    fn migrates_v1_completed_map() {
        let p = migrate(serde_json::from_str(V1).unwrap()).unwrap();
        assert_eq!(p.version, 2);
        assert_eq!(p.tasks["w1-setup"].completed_at, Some(at("2026-11-02T10:00:00Z")));
        assert!(p.sessions.is_empty());
    }

    #[test]
    fn open_v1_file_writes_backup() {
        let dir = temp_dir("v1");
        let path = dir.join("progress.json");
        fs::write(&path, V1).unwrap();

        let store = ProgressStore::open(path.clone());
        assert!(store.data().tasks["w1-setup"].completed_at.is_some());
        assert_eq!(fs::read_to_string(dir.join("progress.v1.backup.json")).unwrap(), V1);
        let saved: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(saved["version"], 2);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn v2_round_trip() {
        let dir = temp_dir("roundtrip");
        let path = dir.join("progress.json");
        let mut store = ProgressStore::open(path.clone());
        store
            .update(|p| {
                let task = p.tasks.entry("w1-setup".into()).or_default();
                task.completed_at = Some(at("2026-11-02T10:00:00Z"));
                task.notes = "## Apuntes".into();
                p.sessions.push(Session {
                    task_id: "w1-setup".into(),
                    start: at("2026-11-02T09:00:00Z"),
                    end: at("2026-11-02T09:25:00Z"),
                    minutes: 25,
                    mode: TimerMode::Pomodoro,
                });
                Ok(())
            })
            .unwrap();

        let reopened = ProgressStore::open(path);
        assert_eq!(reopened.data(), store.data());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn failed_update_keeps_memory_unchanged() {
        let dir = temp_dir("failed");
        let path = dir.join("progress.json");
        let mut store = ProgressStore::open(path.clone());
        let before = store.data().clone();

        let result: Result<(), String> = store.update(|p| {
            p.tasks.entry("x".into()).or_default();
            Err("nope".into())
        });

        assert_eq!(result, Err("nope".into()));
        assert_eq!(store.data(), &before);
        assert!(!path.exists());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn corrupt_file_is_moved_aside() {
        let dir = temp_dir("corrupt");
        let path = dir.join("progress.json");
        fs::write(&path, "{ not json").unwrap();

        let store = ProgressStore::open(path.clone());
        assert!(store.data().tasks.is_empty());
        assert!(!path.exists());
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 1);
        let _ = fs::remove_dir_all(dir);
    }
}
