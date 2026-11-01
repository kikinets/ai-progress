pub mod stats;
pub mod store;
pub mod streak;

use std::collections::BTreeMap;

use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;

use crate::roadmap::Roadmap;

pub use stats::Stats;
pub use store::{Progress, ProgressStore, TaskProgress};
pub use streak::Streak;

/// What the UI receives: raw progress plus everything derived from it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressView {
    pub tasks: BTreeMap<String, TaskProgress>,
    pub streak: Streak,
    pub stats: Stats,
}

/// Returned by every command that changes progress, so the UI can celebrate what just happened.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressUpdate {
    pub view: ProgressView,
    pub new_badges: Vec<String>,
    pub level_up: Option<u32>,
}

pub fn build_view<Tz: TimeZone>(r: &Roadmap, p: &Progress, now: DateTime<Tz>) -> ProgressView {
    let tz = now.timezone();
    ProgressView {
        tasks: p.tasks.clone(),
        streak: streak::compute_streak(streak::study_days(p, &tz), now.date_naive()),
        stats: stats::stats(r, p, now),
    }
}

/// Task id -> completion time, the shape the coach prompts use.
pub fn completed_map(p: &Progress) -> BTreeMap<String, DateTime<Utc>> {
    p.tasks
        .iter()
        .filter_map(|(id, t)| t.completed_at.map(|at| (id.clone(), at)))
        .collect()
}
