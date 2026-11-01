// XP and levels. XP is always recomputed from progress, so unchecking a task removes its XP.

use serde::Serialize;

use crate::roadmap::{Roadmap, TaskType};

use super::store::Progress;

pub const XP_SUBTASK: u32 = 5;
pub const XP_TASK: u32 = 20;
pub const XP_REVIEW: u32 = 30;
pub const XP_DELIVERABLE: u32 = 80;
/// One XP per this many full minutes of each study session.
pub const MINUTES_PER_XP: u32 = 5;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct XpView {
    pub total: u32,
    pub level: u32,
    pub xp_into_level: u32,
    pub xp_for_next_level: u32,
}

pub fn total_xp(r: &Roadmap, p: &Progress) -> u32 {
    let tasks: u32 = p
        .tasks
        .iter()
        .map(|(id, t)| {
            let subtasks = t.subtasks.len() as u32 * XP_SUBTASK;
            let done = match (t.completed_at, r.task(id).map(|task| task.kind)) {
                (Some(_), Some(TaskType::Deliverable)) => XP_DELIVERABLE,
                (Some(_), Some(TaskType::Review)) => XP_REVIEW,
                (Some(_), Some(_)) => XP_TASK,
                // Tasks no longer in the roadmap give no XP.
                _ => 0,
            };
            subtasks + done
        })
        .sum();
    let focus: u32 = p.sessions.iter().map(|s| s.minutes / MINUTES_PER_XP).sum();
    tasks + focus
}

/// Going from level n to n + 1 costs 100 × n XP; everyone starts at level 1.
pub fn level_for(xp: u32) -> XpView {
    let (mut level, mut left) = (1, xp);
    while left >= 100 * level {
        left -= 100 * level;
        level += 1;
    }
    XpView { total: xp, level, xp_into_level: left, xp_for_next_level: 100 * level }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::stats::tests::{session, utc};
    use crate::progress::store::TaskProgress;

    #[test]
    fn level_boundaries() {
        let lv = |xp| {
            let v = level_for(xp);
            (v.level, v.xp_into_level, v.xp_for_next_level)
        };
        assert_eq!(lv(0), (1, 0, 100));
        assert_eq!(lv(99), (1, 99, 100));
        assert_eq!(lv(100), (2, 0, 200));
        assert_eq!(lv(299), (2, 199, 200));
        assert_eq!(lv(300), (3, 0, 300));
        assert_eq!(level_for(300).total, 300);
    }

    #[test]
    fn xp_by_task_type_and_minutes() {
        let r = crate::roadmap::load().unwrap();
        let done = || TaskProgress { completed_at: Some(utc("2026-11-07T10:00:00Z")), ..Default::default() };
        let mut p = Progress::default();
        p.tasks.insert("w1-deliverable".into(), done());
        p.tasks.insert("w1-review".into(), done());
        let mut partial = TaskProgress::default();
        partial.subtasks.insert("w1-setup-1".into(), utc("2026-11-02T10:00:00Z"));
        partial.subtasks.insert("w1-setup-2".into(), utc("2026-11-02T10:00:00Z"));
        p.tasks.insert("w1-setup".into(), partial);
        p.sessions.push(session("2026-11-02T09:00:00Z", 27));
        assert_eq!(total_xp(&r, &p), 80 + 30 + 10 + 5);
    }
}
