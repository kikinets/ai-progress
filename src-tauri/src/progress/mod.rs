pub mod session;
pub mod stats;
pub mod store;
pub mod streak;

use std::collections::BTreeMap;

use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;

use crate::roadmap::Roadmap;

pub use stats::Stats;
pub use store::{ActiveSession, Progress, ProgressStore, TaskProgress, TimerMode};
pub use streak::Streak;

/// What the UI receives: raw progress plus everything derived from it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressView {
    pub tasks: BTreeMap<String, TaskProgress>,
    pub active_session: Option<ActiveSession>,
    /// Seconds studied in the active session as of when the view was built.
    pub active_elapsed_seconds: u64,
    /// One-off message for the user (e.g. a forgotten session was closed).
    pub notice: Option<String>,
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
        active_session: p.active_session.clone(),
        active_elapsed_seconds: p
            .active_session
            .as_ref()
            .map_or(0, |a| session::elapsed_seconds(a, now.with_timezone(&Utc))),
        notice: None,
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
