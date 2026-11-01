// Study statistics derived from sessions and completions, in the user's local time.

use std::collections::BTreeMap;

use chrono::{DateTime, Datelike, Duration, NaiveDate, TimeZone};
use serde::Serialize;

use crate::roadmap::Roadmap;

use super::store::Progress;

pub const HEATMAP_DAYS: i64 = 84;
const STUDY_DAYS_PER_WEEK: u32 = 6;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DayStat {
    pub date: NaiveDate,
    pub minutes: u32,
    pub tasks_done: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub today_minutes: u32,
    pub week_minutes: u32,
    pub week_target_minutes: u32,
    pub total_minutes: u32,
    /// Exactly HEATMAP_DAYS entries ending today, oldest first.
    pub minutes_by_day: Vec<DayStat>,
    pub minutes_by_task: BTreeMap<String, u32>,
}

/// Session minutes per local date; a session counts on the day it started.
pub fn minutes_per_day<Tz: TimeZone>(p: &Progress, tz: &Tz) -> BTreeMap<NaiveDate, u32> {
    let mut days = BTreeMap::new();
    for s in &p.sessions {
        *days.entry(s.start.with_timezone(tz).date_naive()).or_insert(0) += s.minutes;
    }
    days
}

fn tasks_done_per_day<Tz: TimeZone>(p: &Progress, tz: &Tz) -> BTreeMap<NaiveDate, u32> {
    let mut days = BTreeMap::new();
    for at in p.tasks.values().filter_map(|t| t.completed_at) {
        *days.entry(at.with_timezone(tz).date_naive()).or_insert(0) += 1;
    }
    days
}

pub fn stats<Tz: TimeZone>(r: &Roadmap, p: &Progress, now: DateTime<Tz>) -> Stats {
    let tz = now.timezone();
    let today = now.date_naive();
    let week_start = today - Duration::days(today.weekday().num_days_from_monday() as i64);
    let minutes = minutes_per_day(p, &tz);
    let done = tasks_done_per_day(p, &tz);

    let mut minutes_by_task = BTreeMap::new();
    for s in &p.sessions {
        *minutes_by_task.entry(s.task_id.clone()).or_insert(0) += s.minutes;
    }

    Stats {
        today_minutes: minutes.get(&today).copied().unwrap_or(0),
        week_minutes: minutes.range(week_start..=today).map(|(_, m)| m).sum(),
        week_target_minutes: r.daily_target_minutes * STUDY_DAYS_PER_WEEK,
        total_minutes: minutes.values().sum(),
        minutes_by_day: (0..HEATMAP_DAYS)
            .rev()
            .map(|ago| {
                let date = today - Duration::days(ago);
                DayStat {
                    date,
                    minutes: minutes.get(&date).copied().unwrap_or(0),
                    tasks_done: done.get(&date).copied().unwrap_or(0),
                }
            })
            .collect(),
        minutes_by_task,
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::progress::store::{Session, TaskProgress, TimerMode};
    use chrono::{FixedOffset, Utc};

    pub fn tz() -> FixedOffset {
        FixedOffset::east_opt(3600).unwrap()
    }

    pub fn utc(s: &str) -> DateTime<Utc> {
        s.parse().unwrap()
    }

    pub fn session(start: &str, minutes: u32) -> Session {
        let start = utc(start);
        Session {
            task_id: "w1-setup".into(),
            start,
            end: start + Duration::minutes(minutes as i64),
            minutes,
            mode: TimerMode::Pomodoro,
        }
    }

    fn roadmap() -> Roadmap {
        crate::roadmap::load().unwrap()
    }

    #[test]
    fn session_crossing_midnight_counts_on_start_day() {
        let p = Progress { sessions: vec![session("2026-11-02T22:40:00Z", 60)], ..Default::default() };
        // 22:40 UTC is 23:40 at +01:00, so it belongs to Nov 2 local even though it ends on Nov 3.
        let days = minutes_per_day(&p, &tz());
        assert_eq!(days.get(&NaiveDate::from_ymd_opt(2026, 11, 2).unwrap()), Some(&60));
        assert_eq!(days.len(), 1);
    }

    #[test]
    fn stats_week_and_today() {
        // Wed 2026-11-04; week is Mon 2 .. Sun 8. Sun Nov 1 belongs to the previous week.
        let p = Progress {
            sessions: vec![
                session("2026-11-02T09:00:00Z", 30),
                session("2026-11-04T09:00:00Z", 45),
                session("2026-11-01T09:00:00Z", 20),
            ],
            ..Default::default()
        };
        let now = tz().with_ymd_and_hms(2026, 11, 4, 18, 0, 0).unwrap();
        let s = stats(&roadmap(), &p, now);
        assert_eq!(s.today_minutes, 45);
        assert_eq!(s.week_minutes, 75);
        assert_eq!(s.week_target_minutes, 900);
        assert_eq!(s.total_minutes, 95);
        assert_eq!(s.minutes_by_task["w1-setup"], 95);
    }

    #[test]
    fn heatmap_has_84_days_ending_today() {
        let mut p = Progress { sessions: vec![session("2026-11-04T09:00:00Z", 45)], ..Default::default() };
        p.tasks.insert(
            "w1-setup".into(),
            TaskProgress { completed_at: Some(utc("2026-11-04T10:00:00Z")), ..Default::default() },
        );
        let now = tz().with_ymd_and_hms(2026, 11, 4, 18, 0, 0).unwrap();
        let s = stats(&roadmap(), &p, now);
        assert_eq!(s.minutes_by_day.len(), 84);
        let last = s.minutes_by_day.last().unwrap();
        assert_eq!(last, &DayStat { date: NaiveDate::from_ymd_opt(2026, 11, 4).unwrap(), minutes: 45, tasks_done: 1 });
        assert_eq!(s.minutes_by_day[0].date, NaiveDate::from_ymd_opt(2026, 8, 13).unwrap());
    }
}
