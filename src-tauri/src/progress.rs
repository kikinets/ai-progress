use std::{
    collections::{BTreeMap, BTreeSet},
    fs, io,
    path::PathBuf,
};

use chrono::{DateTime, Local, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

const CURRENT_VERSION: u32 = 1;

/// What is stored on disk in progress.json.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Progress {
    pub version: u32,
    /// Task id -> when it was completed.
    #[serde(default)]
    pub completed: BTreeMap<String, DateTime<Utc>>,
}

impl Default for Progress {
    fn default() -> Self {
        Self {
            version: CURRENT_VERSION,
            completed: BTreeMap::new(),
        }
    }
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Streak {
    pub current: u32,
    pub longest: u32,
    pub studied_today: bool,
}

/// What the UI receives: raw progress plus derived data.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressView {
    pub completed: BTreeMap<String, DateTime<Utc>>,
    pub streak: Streak,
}

/// Counts consecutive study days. The current streak stays alive until a full day is missed,
/// so studying yesterday but not yet today still counts.
pub fn compute_streak(days: impl IntoIterator<Item = NaiveDate>, today: NaiveDate) -> Streak {
    let days: BTreeSet<NaiveDate> = days.into_iter().filter(|d| *d <= today).collect();

    let mut longest = 0;
    let mut run = 0;
    let mut last: Option<NaiveDate> = None;
    for &day in &days {
        run = match last {
            Some(prev) if prev.succ_opt() == Some(day) => run + 1,
            _ => 1,
        };
        longest = longest.max(run);
        last = Some(day);
    }

    let current = match last {
        Some(day) if day == today || Some(day) == today.pred_opt() => run,
        _ => 0,
    };

    Streak {
        current,
        longest,
        studied_today: days.contains(&today),
    }
}

/// Owns progress.json: loads it once, keeps it in memory and saves on every change.
pub struct ProgressStore {
    path: PathBuf,
    data: Progress,
}

impl ProgressStore {
    pub fn open(path: PathBuf) -> Self {
        let data = match fs::read_to_string(&path) {
            Ok(text) => serde_json::from_str(&text).unwrap_or_else(|e| {
                // Keep the broken file for inspection instead of overwriting it.
                let stamp = Local::now().format("%Y%m%d-%H%M%S");
                let backup = path.with_file_name(format!("progress.corrupt-{stamp}.json"));
                eprintln!("progress.json is invalid ({e}); moved to {}", backup.display());
                let _ = fs::rename(&path, &backup);
                Progress::default()
            }),
            Err(_) => Progress::default(),
        };
        Self { path, data }
    }

    pub fn set_done(&mut self, task_id: &str, done: bool) -> io::Result<()> {
        let previous = self.data.clone();
        if done {
            self.data
                .completed
                .entry(task_id.to_string())
                .or_insert_with(Utc::now);
        } else {
            self.data.completed.remove(task_id);
        }

        // Memory and disk must agree: undo the change if it could not be saved.
        self.save().inspect_err(|_| self.data = previous)
    }

    pub fn view(&self) -> ProgressView {
        let today = Local::now().date_naive();
        let days = self
            .data
            .completed
            .values()
            .map(|at| at.with_timezone(&Local).date_naive());

        ProgressView {
            completed: self.data.completed.clone(),
            streak: compute_streak(days, today),
        }
    }

    /// Writes to a temporary file and renames it, so a crash never leaves a half-written file.
    fn save(&self) -> io::Result<()> {
        if let Some(dir) = self.path.parent() {
            fs::create_dir_all(dir)?;
        }
        let json = serde_json::to_string_pretty(&self.data)?;
        let tmp = self.path.with_extension("json.tmp");
        fs::write(&tmp, json)?;
        fs::rename(&tmp, &self.path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn d(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    #[test]
    fn no_study_days_means_no_streak() {
        let streak = compute_streak([], d("2026-11-10"));
        assert_eq!(streak, Streak { current: 0, longest: 0, studied_today: false });
    }

    #[test]
    fn consecutive_days_ending_today() {
        let days = [d("2026-11-08"), d("2026-11-09"), d("2026-11-10"), d("2026-11-10")];
        let streak = compute_streak(days, d("2026-11-10"));
        assert_eq!(streak, Streak { current: 3, longest: 3, studied_today: true });
    }

    #[test]
    fn streak_survives_until_today_ends() {
        let days = [d("2026-11-08"), d("2026-11-09")];
        let streak = compute_streak(days, d("2026-11-10"));
        assert_eq!(streak, Streak { current: 2, longest: 2, studied_today: false });
    }

    #[test]
    fn missing_a_full_day_breaks_the_streak() {
        let days = [d("2026-11-01"), d("2026-11-02"), d("2026-11-03"), d("2026-11-07")];
        let streak = compute_streak(days, d("2026-11-09"));
        assert_eq!(streak, Streak { current: 0, longest: 3, studied_today: false });
    }

    fn temp_path(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("ai-progress-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir.join("progress.json")
    }

    #[test]
    fn progress_round_trips_through_disk() {
        let path = temp_path("roundtrip");
        let mut store = ProgressStore::open(path.clone());
        store.set_done("w1-setup", true).unwrap();
        store.set_done("w1-venv", true).unwrap();
        store.set_done("w1-venv", false).unwrap();

        let reopened = ProgressStore::open(path.clone());
        assert_eq!(reopened.data.completed.keys().collect::<Vec<_>>(), ["w1-setup"]);
        assert!(reopened.view().streak.studied_today);
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn corrupt_file_is_moved_aside() {
        let path = temp_path("corrupt");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, "{ not json").unwrap();

        let store = ProgressStore::open(path.clone());
        assert!(store.data.completed.is_empty());
        assert!(!path.exists());
        let backups = fs::read_dir(path.parent().unwrap()).unwrap().count();
        assert_eq!(backups, 1);
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }
}
