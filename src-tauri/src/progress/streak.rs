use std::collections::BTreeSet;

use chrono::NaiveDate;
use serde::Serialize;

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
}
