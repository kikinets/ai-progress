// Badges: conditions are evaluated from progress; once reached, the unlock date is stored
// in progress and the badge is never taken away.

use chrono::{DateTime, TimeZone, Timelike, Utc};
use serde::Serialize;

use crate::roadmap::{Roadmap, TaskType};

use super::{stats, store::Progress, streak::Streak};

pub const BADGES: [&str; 15] = [
    "first-step",
    "first-deliverable",
    "streak-3",
    "streak-7",
    "streak-14",
    "focus-1h",
    "focus-10h",
    "focus-25h",
    "marathon",
    "deep-work",
    "early-bird",
    "night-owl",
    "week-complete",
    "skill-mastered",
    "note-taker",
];

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BadgeView {
    pub id: String,
    pub unlocked_at: Option<DateTime<Utc>>,
    /// How far along the condition is, out of `target` (e.g. 4 of 7 days).
    pub progress: u32,
    pub target: u32,
}

/// Current progress towards every badge, in BADGES order.
pub fn evaluate<Tz: TimeZone>(r: &Roadmap, p: &Progress, streak: &Streak, tz: &Tz) -> Vec<BadgeView> {
    let is_done = |id: &str| p.tasks.get(id).is_some_and(|t| t.completed_at.is_some());
    let done_tasks = || r.tasks().filter(|(_, _, t)| is_done(&t.id));
    let total_minutes: u32 = p.sessions.iter().map(|s| s.minutes).sum();
    let best_day = stats::minutes_per_day(p, tz).into_values().max().unwrap_or(0);
    let longest_session = p.sessions.iter().map(|s| s.minutes).max().unwrap_or(0);
    let started_at = |pred: fn(u32) -> bool| {
        p.sessions.iter().any(|s| pred(s.start.with_timezone(tz).hour())) as u32
    };
    let notes = p.tasks.values().filter(|t| !t.notes.trim().is_empty()).count() as u32;

    // Best (done, total) among groups of tasks: the group closest to complete.
    let best = |groups: Vec<(u32, u32)>| {
        groups
            .into_iter()
            .filter(|(_, total)| *total > 0)
            .max_by(|a, b| (a.0 * b.1).cmp(&(b.0 * a.1)).then(a.0.cmp(&b.0)))
            .unwrap_or((0, 1))
    };
    let week = best(
        r.phases
            .iter()
            .flat_map(|ph| &ph.weeks)
            .map(|w| {
                let tasks: Vec<_> = w.days.iter().flat_map(|d| &d.tasks).collect();
                (tasks.iter().filter(|t| is_done(&t.id)).count() as u32, tasks.len() as u32)
            })
            .collect(),
    );
    let skill = best(
        r.skills
            .iter()
            .map(|s| {
                let tasks: Vec<_> = r.tasks().filter(|(_, _, t)| t.skills.contains(&s.id)).collect();
                (tasks.iter().filter(|(_, _, t)| is_done(&t.id)).count() as u32, tasks.len() as u32)
            })
            .collect(),
    );

    let conditions: [(u32, u32); 15] = [
        (done_tasks().count() as u32, 1),
        (done_tasks().filter(|(_, _, t)| t.kind == TaskType::Deliverable).count() as u32, 1),
        (streak.longest, 3),
        (streak.longest, 7),
        (streak.longest, 14),
        (total_minutes, 60),
        (total_minutes, 600),
        (total_minutes, 1500),
        (best_day, 180),
        (longest_session, 90),
        (started_at(|h| h < 8), 1),
        (started_at(|h| h >= 23), 1),
        week,
        skill,
        (notes, 5),
    ];

    BADGES
        .iter()
        .zip(conditions)
        .map(|(id, (progress, target))| BadgeView {
            id: id.to_string(),
            unlocked_at: p.badges.get(*id).copied(),
            progress: progress.min(target),
            target,
        })
        .collect()
}

/// Stores the unlock date of every newly reached badge; returns their ids.
pub fn unlock(p: &mut Progress, views: &[BadgeView], now: DateTime<Utc>) -> Vec<String> {
    let new: Vec<String> = views
        .iter()
        .filter(|v| v.progress >= v.target && !p.badges.contains_key(&v.id))
        .map(|v| v.id.clone())
        .collect();
    for id in &new {
        p.badges.insert(id.clone(), now);
    }
    new
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::stats::tests::{session, tz, utc};
    use crate::progress::store::TaskProgress;

    fn roadmap() -> Roadmap {
        crate::roadmap::load().unwrap()
    }

    fn no_streak() -> Streak {
        Streak { current: 0, longest: 0, studied_today: false }
    }

    fn done() -> TaskProgress {
        TaskProgress { completed_at: Some(utc("2026-11-02T10:00:00Z")), ..Default::default() }
    }

    /// (progress, target) of one badge.
    fn of(views: &[BadgeView], id: &str) -> (u32, u32) {
        let v = views.iter().find(|v| v.id == id).unwrap();
        (v.progress, v.target)
    }

    fn eval(p: &Progress, streak: &Streak) -> Vec<BadgeView> {
        evaluate(&roadmap(), p, streak, &tz())
    }

    #[test]
    fn all_badges_listed_in_order() {
        let views = eval(&Progress::default(), &no_streak());
        assert_eq!(views.iter().map(|v| v.id.as_str()).collect::<Vec<_>>(), BADGES);
        assert!(views.iter().all(|v| v.progress == 0 && v.unlocked_at.is_none()));
    }

    #[test]
    fn first_step_and_first_deliverable() {
        let mut p = Progress::default();
        p.tasks.insert("w1-setup".into(), done());
        let views = eval(&p, &no_streak());
        assert_eq!(of(&views, "first-step"), (1, 1));
        assert_eq!(of(&views, "first-deliverable"), (0, 1));
        p.tasks.insert("w1-deliverable".into(), done());
        assert_eq!(of(&eval(&p, &no_streak()), "first-deliverable"), (1, 1));
    }

    #[test]
    fn streak_badges_use_longest_streak() {
        let views = eval(&Progress::default(), &Streak { current: 0, longest: 7, studied_today: false });
        assert_eq!(of(&views, "streak-3"), (3, 3));
        assert_eq!(of(&views, "streak-7"), (7, 7));
        assert_eq!(of(&views, "streak-14"), (7, 14));
    }

    #[test]
    fn focus_badges_use_total_minutes() {
        let p = Progress {
            sessions: vec![session("2026-11-02T09:00:00Z", 40), session("2026-11-03T09:00:00Z", 25)],
            ..Default::default()
        };
        let views = eval(&p, &no_streak());
        assert_eq!(of(&views, "focus-1h"), (60, 60));
        assert_eq!(of(&views, "focus-10h"), (65, 600));
        assert_eq!(of(&views, "focus-25h"), (65, 1500));
    }

    #[test]
    fn marathon_counts_minutes_in_one_local_day() {
        let p = Progress {
            sessions: vec![
                session("2026-11-02T08:00:00Z", 90),
                session("2026-11-02T15:00:00Z", 90),
                session("2026-11-03T08:00:00Z", 100),
            ],
            ..Default::default()
        };
        let views = eval(&p, &no_streak());
        assert_eq!(of(&views, "marathon"), (180, 180));
        assert_eq!(of(&views, "deep-work"), (90, 90));
    }

    #[test]
    fn deep_work_needs_one_long_session() {
        let p = Progress { sessions: vec![session("2026-11-02T08:00:00Z", 89)], ..Default::default() };
        assert_eq!(of(&eval(&p, &no_streak()), "deep-work"), (89, 90));
    }

    #[test]
    fn early_bird_and_night_owl_use_local_start_hour() {
        // tz() is +01:00, so 06:59Z is 07:59 local.
        let early = Progress { sessions: vec![session("2026-11-02T06:59:00Z", 25)], ..Default::default() };
        let not_early = Progress { sessions: vec![session("2026-11-02T07:00:00Z", 25)], ..Default::default() };
        assert_eq!(of(&eval(&early, &no_streak()), "early-bird"), (1, 1));
        assert_eq!(of(&eval(&not_early, &no_streak()), "early-bird"), (0, 1));

        let owl = Progress { sessions: vec![session("2026-11-02T22:00:00Z", 25)], ..Default::default() };
        let not_owl = Progress { sessions: vec![session("2026-11-02T21:59:00Z", 25)], ..Default::default() };
        assert_eq!(of(&eval(&owl, &no_streak()), "night-owl"), (1, 1));
        assert_eq!(of(&eval(&not_owl, &no_streak()), "night-owl"), (0, 1));
    }

    #[test]
    fn week_complete_needs_every_task_of_a_week() {
        let r = roadmap();
        let week = r.prep_weeks().next().unwrap();
        let ids: Vec<_> = week.days.iter().flat_map(|d| &d.tasks).map(|t| t.id.clone()).collect();
        let mut p = Progress::default();
        for id in &ids[1..] {
            p.tasks.insert(id.clone(), done());
        }
        let n = ids.len() as u32;
        assert_eq!(of(&eval(&p, &no_streak()), "week-complete"), (n - 1, n));
        p.tasks.insert(ids[0].clone(), done());
        assert_eq!(of(&eval(&p, &no_streak()), "week-complete"), (n, n));
    }

    #[test]
    fn skill_mastered_needs_every_task_of_a_skill() {
        let r = roadmap();
        let sql: Vec<_> = r.tasks().filter(|(_, _, t)| t.skills.contains(&"sql".to_string())).map(|(_, _, t)| t.id.clone()).collect();
        let mut p = Progress::default();
        for id in &sql {
            p.tasks.insert(id.clone(), done());
        }
        let (progress, target) = of(&eval(&p, &no_streak()), "skill-mastered");
        assert_eq!(progress, target);
    }

    #[test]
    fn note_taker_counts_tasks_with_notes() {
        let mut p = Progress::default();
        for id in ["w1-setup", "w1-venv", "w1-git", "w1-basics"] {
            p.tasks.insert(id.into(), TaskProgress { notes: "apuntes".into(), ..Default::default() });
        }
        p.tasks.insert("w1-prework".into(), TaskProgress { notes: "  ".into(), ..Default::default() });
        assert_eq!(of(&eval(&p, &no_streak()), "note-taker"), (4, 5));
    }

    #[test]
    fn unlock_records_new_badges_once() {
        let mut p = Progress::default();
        p.tasks.insert("w1-setup".into(), done());
        let now = utc("2026-11-02T10:00:00Z");
        let views = eval(&p, &no_streak());
        assert_eq!(unlock(&mut p, &views, now), ["first-step"]);
        assert_eq!(p.badges["first-step"], now);
        let views = eval(&p, &no_streak());
        assert_eq!(views[0].unlocked_at, Some(now));
        assert!(unlock(&mut p, &views, now).is_empty());
    }
}
