use std::collections::BTreeSet;

use chrono::{NaiveDate, TimeZone};
use serde::Serialize;

use super::store::Progress;

/// Studying fewer minutes than this without completing anything does not count as a study day.
pub const MIN_STUDY_MINUTES: u32 = 10;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Streak {
    pub current: u32,
    pub longest: u32,
    pub studied_today: bool,
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

/// Local dates that count for the streak: a task or subtask was completed, or at least
/// MIN_STUDY_MINUTES were studied that day.
pub fn study_days<Tz: TimeZone>(p: &Progress, tz: &Tz) -> BTreeSet<NaiveDate> {
    let local = |at: &chrono::DateTime<chrono::Utc>| at.with_timezone(tz).date_naive();
    let completions = p.tasks.values().flat_map(|t| t.completed_at.iter().chain(t.subtasks.values()));
    let studied = super::stats::minutes_per_day(p, tz)
        .into_iter()
        .filter(|(_, minutes)| *minutes >= MIN_STUDY_MINUTES)
        .map(|(day, _)| day);
    completions.map(local).chain(studied).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::stats::tests::{session, tz, utc};
    use crate::progress::store::TaskProgress;

    fn d(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    #[test]
    fn nine_minutes_does_not_count_ten_does() {
        let p = Progress {
            sessions: vec![session("2026-11-02T09:00:00Z", 9), session("2026-11-03T09:00:00Z", 10)],
            ..Default::default()
        };
        assert_eq!(study_days(&p, &tz()).into_iter().collect::<Vec<_>>(), [d("2026-11-03")]);
    }

    #[test]
    fn subtask_completion_counts_as_study_day() {
        let mut p = Progress::default();
        let mut task = TaskProgress::default();
        task.subtasks.insert("w1-setup-1".into(), utc("2026-11-05T09:00:00Z"));
        p.tasks.insert("w1-setup".into(), task);
        assert!(study_days(&p, &tz()).contains(&d("2026-11-05")));
    }

    #[test]
    fn completion_counts_on_local_date() {
        let mut p = Progress::default();
        p.tasks.insert(
            "w1-setup".into(),
            TaskProgress { completed_at: Some(utc("2026-11-02T23:30:00Z")), ..Default::default() },
        );
        assert_eq!(study_days(&p, &tz()).into_iter().collect::<Vec<_>>(), [d("2026-11-03")]);
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
}
