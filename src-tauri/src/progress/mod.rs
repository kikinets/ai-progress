pub mod badges;
pub mod session;
pub mod stats;
pub mod store;
pub mod streak;
pub mod xp;

use std::collections::BTreeMap;

use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;

use crate::roadmap::{Roadmap, Task};

pub use stats::Stats;
pub use store::{ActiveSession, Progress, ProgressStore, TaskProgress, TimerMode};
pub use badges::BadgeView;
pub use streak::Streak;
pub use xp::XpView;

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
    pub xp: XpView,
    pub badges: Vec<BadgeView>,
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
    let streak = streak::compute_streak(streak::study_days(p, &tz), now.date_naive());
    ProgressView {
        tasks: p.tasks.clone(),
        active_session: p.active_session.clone(),
        active_elapsed_seconds: p
            .active_session
            .as_ref()
            .map_or(0, |a| session::elapsed_seconds(a, now.with_timezone(&Utc))),
        notice: None,
        streak: streak.clone(),
        stats: stats::stats(r, p, now.clone()),
        xp: xp::level_for(xp::total_xp(r, p)),
        badges: badges::evaluate(r, p, &streak, &tz),
    }
}

/// Task id -> completion time, the shape the coach prompts use.
pub fn completed_map(p: &Progress) -> BTreeMap<String, DateTime<Utc>> {
    p.tasks
        .iter()
        .filter_map(|(id, t)| t.completed_at.map(|at| (id.clone(), at)))
        .collect()
}

/// After a change: stores newly reached badges and reports them, plus the new level if it went up.
pub fn rewards<Tz: TimeZone>(r: &Roadmap, before: &Progress, after: &mut Progress, now: DateTime<Tz>) -> (Vec<String>, Option<u32>) {
    let tz = now.timezone();
    let streak = streak::compute_streak(streak::study_days(after, &tz), now.date_naive());
    let new_badges = badges::unlock(after, &badges::evaluate(r, after, &streak, &tz), now.with_timezone(&Utc));
    let (old, new) = (xp::level_for(xp::total_xp(r, before)).level, xp::level_for(xp::total_xp(r, after)).level);
    (new_badges, (new > old).then_some(new))
}

pub const MAX_NOTES_CHARS: usize = 50_000;

/// Marks one subtask of `task` as done or not done.
pub fn set_subtask(p: &mut Progress, task: &Task, subtask_id: &str, done: bool, now: DateTime<Utc>) -> Result<(), String> {
    if !task.subtasks.iter().any(|s| s.id == subtask_id) {
        return Err(format!("subtask {subtask_id} does not belong to task {}", task.id));
    }
    let entry = p.tasks.entry(task.id.clone()).or_default();
    if done {
        entry.subtasks.entry(subtask_id.to_string()).or_insert(now);
    } else {
        entry.subtasks.remove(subtask_id);
    }
    prune(p, &task.id);
    Ok(())
}

pub fn set_task(p: &mut Progress, task_id: &str, done: bool, now: DateTime<Utc>) {
    let entry = p.tasks.entry(task_id.to_string()).or_default();
    entry.completed_at = if done { entry.completed_at.or(Some(now)) } else { None };
    prune(p, task_id);
}

pub fn set_notes(p: &mut Progress, task_id: &str, notes: String) -> Result<(), String> {
    if notes.chars().count() > MAX_NOTES_CHARS {
        return Err("Las notas son demasiado largas.".into());
    }
    p.tasks.entry(task_id.to_string()).or_default().notes = notes;
    prune(p, task_id);
    Ok(())
}

/// Drops a task entry that no longer holds anything, so progress.json stays small.
fn prune(p: &mut Progress, task_id: &str) {
    if p.tasks.get(task_id).is_some_and(|t| *t == TaskProgress::default()) {
        p.tasks.remove(task_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roadmap() -> Roadmap {
        crate::roadmap::load().unwrap()
    }

    fn now() -> DateTime<Utc> {
        "2026-11-02T10:00:00Z".parse().unwrap()
    }

    #[test]
    fn subtask_must_belong_to_task() {
        let r = roadmap();
        let mut p = Progress::default();
        let err = set_subtask(&mut p, r.task("w1-setup").unwrap(), "w1-venv-1", true, now()).unwrap_err();
        assert!(err.contains("w1-venv-1"), "{err}");
        assert!(p.tasks.is_empty());
    }

    #[test]
    fn subtask_toggle_round_trip() {
        let r = roadmap();
        let task = r.task("w1-setup").unwrap();
        let mut p = Progress::default();
        set_subtask(&mut p, task, "w1-setup-1", true, now()).unwrap();
        assert_eq!(p.tasks["w1-setup"].subtasks.get("w1-setup-1"), Some(&now()));
        set_subtask(&mut p, task, "w1-setup-1", false, now()).unwrap();
        assert!(!p.tasks.contains_key("w1-setup"), "empty entries are pruned");
    }

    fn tz_now() -> DateTime<chrono::FixedOffset> {
        now().with_timezone(&chrono::FixedOffset::east_opt(3600).unwrap())
    }

    #[test]
    fn update_reports_new_badges_and_level_up() {
        let r = roadmap();
        let mut p = Progress::default();
        // 4 regular tasks (80 XP) keep level 1; the deliverable (+80) crosses 100.
        for id in ["w1-setup", "w1-venv", "w1-git", "w1-basics"] {
            set_task(&mut p, id, true, now());
        }
        let before = p.clone();
        let (badges, level_up) = rewards(&r, &Progress::default(), &mut p, tz_now());
        assert_eq!(badges, ["first-step"]);
        assert_eq!(level_up, None);

        set_task(&mut p, "w1-deliverable", true, now());
        let (badges, level_up) = rewards(&r, &before, &mut p, tz_now());
        assert_eq!(badges, ["first-deliverable"]);
        assert_eq!(level_up, Some(2));
    }

    #[test]
    fn badge_survives_unchecking_but_xp_drops() {
        let r = roadmap();
        let mut p = Progress::default();
        set_task(&mut p, "w1-setup", true, now());
        rewards(&r, &Progress::default(), &mut p, tz_now());
        let before = p.clone();
        set_task(&mut p, "w1-setup", false, now());
        let (badges, _) = rewards(&r, &before, &mut p, tz_now());
        assert!(badges.is_empty());
        assert!(p.badges.contains_key("first-step"));
        let view = build_view(&r, &p, tz_now());
        assert_eq!(view.xp.total, 0);
        assert!(view.badges[0].unlocked_at.is_some());
    }

    #[test]
    fn notes_too_long_rejected() {
        let mut p = Progress::default();
        let err = set_notes(&mut p, "w1-setup", "x".repeat(MAX_NOTES_CHARS + 1)).unwrap_err();
        assert_eq!(err, "Las notas son demasiado largas.");
    }

    #[test]
    fn empty_notes_clear_entry() {
        let mut p = Progress::default();
        set_notes(&mut p, "w1-setup", "# Apuntes".into()).unwrap();
        assert_eq!(p.tasks["w1-setup"].notes, "# Apuntes");
        set_notes(&mut p, "w1-setup", String::new()).unwrap();
        assert!(!p.tasks.contains_key("w1-setup"));

        p.tasks.entry("w1-venv".into()).or_default().completed_at = Some(now());
        set_notes(&mut p, "w1-venv", "a".into()).unwrap();
        set_notes(&mut p, "w1-venv", String::new()).unwrap();
        assert!(p.tasks["w1-venv"].completed_at.is_some(), "entries with other data are kept");
    }
}
