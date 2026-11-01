// Study timer state machine. The active session lives in progress.json, so it survives
// closing the app; the UI only shows the time elapsed since `segment_start`.

use chrono::{DateTime, Duration, Utc};

use super::store::{ActiveSession, Progress, Session, TimerMode};

/// A session left open longer than this is closed and capped (the user forgot the timer).
pub const STALE_AFTER_HOURS: i64 = 4;
/// Sessions shorter than this are discarded.
pub const MIN_SESSION_SECONDS: u64 = 60;

fn active(p: &mut Progress) -> Result<&mut ActiveSession, String> {
    p.active_session.as_mut().ok_or_else(|| "no hay ninguna sesión activa".to_string())
}

pub fn start(p: &mut Progress, task_id: &str, mode: TimerMode, now: DateTime<Utc>) -> Result<(), String> {
    if p.active_session.is_some() {
        return Err("ya hay una sesión activa".into());
    }
    p.active_session = Some(ActiveSession {
        task_id: task_id.to_string(),
        mode,
        started_at: now,
        segment_start: Some(now),
        accumulated_seconds: 0,
        paused: false,
    });
    Ok(())
}

pub fn pause(p: &mut Progress, now: DateTime<Utc>) -> Result<(), String> {
    let a = active(p)?;
    let Some(segment_start) = a.segment_start.take() else {
        return Err("la sesión ya está en pausa".into());
    };
    a.accumulated_seconds += (now - segment_start).num_seconds().max(0) as u64;
    a.paused = true;
    Ok(())
}

pub fn resume(p: &mut Progress, now: DateTime<Utc>) -> Result<(), String> {
    let a = active(p)?;
    if a.segment_start.is_some() {
        return Err("la sesión no está en pausa".into());
    }
    a.segment_start = Some(now);
    a.paused = false;
    Ok(())
}

/// Ends the active session; returns it if it was long enough to be recorded.
pub fn stop(p: &mut Progress, now: DateTime<Utc>) -> Result<Option<Session>, String> {
    let seconds = elapsed_seconds(active(p)?, now);
    Ok(finish(p, now, seconds))
}

fn finish(p: &mut Progress, end: DateTime<Utc>, seconds: u64) -> Option<Session> {
    let a = p.active_session.take()?;
    if seconds < MIN_SESSION_SECONDS {
        return None;
    }
    let session = Session { task_id: a.task_id, start: a.started_at, end, minutes: (seconds / 60) as u32, mode: a.mode };
    p.sessions.push(session.clone());
    Some(session)
}

pub fn elapsed_seconds(a: &ActiveSession, now: DateTime<Utc>) -> u64 {
    let running = a.segment_start.map_or(0, |s| (now - s).num_seconds().max(0) as u64);
    a.accumulated_seconds + running
}

/// Closes a forgotten session at the cap; returns it if one was closed.
pub fn close_stale(p: &mut Progress, now: DateTime<Utc>) -> Option<Session> {
    let cap = Duration::hours(STALE_AFTER_HOURS);
    let a = p.active_session.as_ref()?;
    if now - a.started_at <= cap {
        return None;
    }
    let end = a.started_at + cap;
    let seconds = elapsed_seconds(a, end).min(cap.num_seconds() as u64);
    finish(p, end, seconds)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn t(hm: &str) -> DateTime<Utc> {
        format!("2026-11-02T{hm}:00Z").parse().unwrap()
    }

    #[test]
    fn start_twice_errors() {
        let mut p = Progress::default();
        start(&mut p, "w1-setup", TimerMode::Pomodoro, t("10:00")).unwrap();
        assert_eq!(start(&mut p, "w1-venv", TimerMode::Free, t("10:01")), Err("ya hay una sesión activa".into()));
        assert_eq!(p.active_session.unwrap().task_id, "w1-setup");
    }

    #[test]
    fn pause_resume_accumulates() {
        let mut p = Progress::default();
        start(&mut p, "w1-setup", TimerMode::Pomodoro, t("10:00")).unwrap();
        pause(&mut p, t("10:20")).unwrap();
        assert_eq!(elapsed_seconds(p.active_session.as_ref().unwrap(), t("10:25")), 20 * 60);
        resume(&mut p, t("10:30")).unwrap();
        let session = stop(&mut p, t("10:40")).unwrap().unwrap();
        assert_eq!(session.minutes, 30);
        assert_eq!((session.start, session.end), (t("10:00"), t("10:40")));
        assert_eq!(p.sessions, vec![session]);
        assert!(p.active_session.is_none());
    }

    #[test]
    fn short_session_discarded() {
        let mut p = Progress::default();
        start(&mut p, "w1-setup", TimerMode::Free, t("10:00")).unwrap();
        let now = t("10:00") + Duration::seconds(45);
        assert_eq!(stop(&mut p, now), Ok(None));
        assert!(p.sessions.is_empty() && p.active_session.is_none());
    }

    #[test]
    fn stale_session_capped_at_four_hours() {
        let mut p = Progress::default();
        start(&mut p, "w1-setup", TimerMode::Free, t("00:00")).unwrap();
        let closed = close_stale(&mut p, t("10:00")).unwrap();
        assert_eq!(closed.minutes, 240);
        assert_eq!(closed.end, t("04:00"));
        assert!(p.active_session.is_none());
    }

    #[test]
    fn recent_session_is_not_stale() {
        let mut p = Progress::default();
        start(&mut p, "w1-setup", TimerMode::Free, t("10:00")).unwrap();
        assert_eq!(close_stale(&mut p, t("13:59")), None);
        assert!(p.active_session.is_some());
    }

    #[test]
    fn stop_without_active_errors() {
        let mut p = Progress::default();
        assert!(stop(&mut p, t("10:00")).is_err());
        assert!(pause(&mut p, t("10:00")).is_err());
        assert!(resume(&mut p, t("10:00")).is_err());
    }

    #[test]
    fn pausing_twice_errors() {
        let mut p = Progress::default();
        start(&mut p, "w1-setup", TimerMode::Free, t("10:00")).unwrap();
        pause(&mut p, t("10:05")).unwrap();
        assert!(pause(&mut p, t("10:06")).is_err());
    }
}
