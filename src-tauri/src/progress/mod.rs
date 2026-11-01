pub mod store;
pub mod streak;

use std::collections::BTreeMap;

use chrono::{DateTime, Local, Utc};
use serde::Serialize;

pub use store::{Progress, ProgressStore};
pub use streak::Streak;

/// What the UI receives. Temporary v1 shape until Task 5 adds stats and sessions.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressView {
    pub completed: BTreeMap<String, DateTime<Utc>>,
    pub streak: Streak,
}

pub fn build_view(p: &Progress) -> ProgressView {
    let completed: BTreeMap<String, DateTime<Utc>> = p
        .tasks
        .iter()
        .filter_map(|(id, t)| t.completed_at.map(|at| (id.clone(), at)))
        .collect();
    let days = completed.values().map(|at| at.with_timezone(&Local).date_naive());
    let streak = streak::compute_streak(days, Local::now().date_naive());
    ProgressView { completed, streak }
}
