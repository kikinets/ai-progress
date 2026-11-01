use std::collections::{HashMap, HashSet};

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use serde_json::Value;

// Seed data is read-only, so it is embedded in the binary at compile time.
// Cargo rebuilds automatically when data/roadmap.json changes.
const ROADMAP_JSON: &str = include_str!("../../data/roadmap.json");

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Roadmap {
    pub version: u32,
    pub title: String,
    pub goal: String,
    pub daily_target_minutes: u32,
    pub skills: Vec<Skill>,
    pub phases: Vec<Phase>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub requires: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Phase {
    pub id: String,
    pub name: String,
    pub start: Option<NaiveDate>,
    pub end: Option<NaiveDate>,
    pub note: Option<String>,
    pub weeks: Vec<Week>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Week {
    pub id: String,
    pub number: u32,
    pub title: String,
    pub goal: String,
    pub start: NaiveDate,
    pub end: NaiveDate,
    pub days: Vec<Day>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DayKind {
    Study,
    Review,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Day {
    pub date: NaiveDate,
    pub title: String,
    pub kind: DayKind,
    pub tasks: Vec<Task>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskType {
    Concept,
    Practice,
    Deliverable,
    Review,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub kind: TaskType,
    pub skills: Vec<String>,
    pub estimate_minutes: u32,
    pub description: String,
    pub why: String,
    pub resources: Vec<Resource>,
    pub subtasks: Vec<Subtask>,
    pub done_when: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ResourceKind {
    Doc,
    Video,
    Course,
    Article,
    Practice,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub title: String,
    pub url: String,
    pub kind: ResourceKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subtask {
    pub id: String,
    pub title: String,
}

/// The embedded roadmap, parsed and validated.
#[allow(dead_code)] // used once the app switches to v2 (Task 2+)
pub fn load() -> Result<Roadmap, String> {
    let roadmap = parse(ROADMAP_JSON)?;
    roadmap.validate().map_err(|errors| errors.join("\n"))?;
    Ok(roadmap)
}

pub fn parse(json: &str) -> Result<Roadmap, String> {
    serde_json::from_str(json).map_err(|e| format!("invalid roadmap.json: {e}"))
}

impl Roadmap {
    /// Every task with the week and day it belongs to, in plan order.
    pub fn tasks(&self) -> impl Iterator<Item = (&Week, &Day, &Task)> {
        self.phases
            .iter()
            .flat_map(|p| &p.weeks)
            .flat_map(|w| w.days.iter().map(move |d| (w, d)))
            .flat_map(|(w, d)| d.tasks.iter().map(move |t| (w, d, t)))
    }

    #[allow(dead_code)] // used by commands from Task 2
    pub fn task(&self, id: &str) -> Option<&Task> {
        self.tasks().map(|(_, _, t)| t).find(|t| t.id == id)
    }

    #[allow(dead_code)] // used by stats (Task 5)
    pub fn prep_weeks(&self) -> impl Iterator<Item = &Week> {
        self.phases.iter().filter(|p| p.id == "prep").flat_map(|p| &p.weeks)
    }

    /// Checks invariants the app relies on; returns every problem found.
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        let mut seen = HashSet::new();
        for (_, _, task) in self.tasks() {
            for id in std::iter::once(&task.id).chain(task.subtasks.iter().map(|s| &s.id)) {
                if !seen.insert(id.as_str()) {
                    errors.push(format!("duplicate id: {id}"));
                }
            }
            if task.estimate_minutes == 0 {
                errors.push(format!("task {}: estimateMinutes must be > 0", task.id));
            }
            if task.done_when.trim().is_empty() {
                errors.push(format!("task {}: empty doneWhen", task.id));
            }
            for r in &task.resources {
                if !r.url.starts_with("https://") {
                    errors.push(format!("task {}: resource url must use https: {}", task.id, r.url));
                }
            }
        }

        for week in self.phases.iter().flat_map(|p| &p.weeks) {
            for day in &week.days {
                if day.date < week.start || day.date > week.end {
                    errors.push(format!("day {} is outside week {}", day.date, week.id));
                }
            }
        }

        let graph: HashMap<&str, Vec<&str>> = self
            .skills
            .iter()
            .map(|s| (s.id.as_str(), s.requires.iter().map(String::as_str).collect()))
            .collect();
        for (skill, reqs) in &graph {
            for req in reqs.iter().filter(|r| !graph.contains_key(*r)) {
                errors.push(format!("skill {skill} requires unknown skill {req}"));
            }
        }
        for (_, _, task) in self.tasks() {
            for skill in task.skills.iter().filter(|s| !graph.contains_key(s.as_str())) {
                errors.push(format!("task {} uses unknown skill {skill}", task.id));
            }
        }
        if let Some(cycle) = find_cycle(&graph) {
            errors.push(format!("cycle in skills: {cycle}"));
        }

        if errors.is_empty() { Ok(()) } else { Err(errors) }
    }
}

/// Depth-first search: reaching a skill that is still on the current path means a cycle.
fn find_cycle(graph: &HashMap<&str, Vec<&str>>) -> Option<String> {
    fn visit<'a>(
        id: &'a str,
        graph: &HashMap<&'a str, Vec<&'a str>>,
        path: &mut Vec<&'a str>,
        done: &mut HashSet<&'a str>,
    ) -> Option<String> {
        if done.contains(id) {
            return None;
        }
        if path.contains(&id) {
            return Some(format!("{} -> {id}", path.join(" -> ")));
        }
        path.push(id);
        for req in graph.get(id).into_iter().flatten() {
            if let Some(cycle) = visit(req, graph, path, done) {
                return Some(cycle);
            }
        }
        path.pop();
        done.insert(id);
        None
    }

    let mut done = HashSet::new();
    let mut ids: Vec<_> = graph.keys().copied().collect();
    ids.sort();
    ids.into_iter().find_map(|id| visit(id, graph, &mut Vec::new(), &mut done))
}

/// v1 view of the embedded JSON; removed once every caller uses the typed roadmap.
pub fn parse_value() -> serde_json::Result<Value> {
    serde_json::from_str(ROADMAP_JSON)
}

/// Collects every task id in the roadmap, so progress can only reference real tasks.
pub fn task_ids(roadmap: &Value) -> HashSet<String> {
    let as_array = |v: &Value, key: &str| v[key].as_array().cloned().unwrap_or_default();

    as_array(roadmap, "phases")
        .iter()
        .flat_map(|phase| as_array(phase, "weeks"))
        .flat_map(|week| as_array(&week, "tasks"))
        .filter_map(|task| task["id"].as_str().map(String::from))
        .collect()
}

#[cfg(test)]
mod v2_tests {
    use super::*;

    const FIXTURE: &str = r#"{
      "version": 2, "title": "T", "goal": "G", "dailyTargetMinutes": 150,
      "skills": [{ "id": "python", "name": "Python", "description": "d", "requires": [] }],
      "phases": [{ "id": "prep", "name": "P", "start": "2026-11-02", "end": "2026-11-08", "note": null,
        "weeks": [{ "id": "w1", "number": 1, "title": "W", "goal": "g", "start": "2026-11-02", "end": "2026-11-08",
          "days": [{ "date": "2026-11-02", "title": "D", "kind": "study",
            "tasks": [{ "id": "t1", "title": "Task", "type": "practice", "skills": ["python"],
              "estimateMinutes": 60, "description": "d", "why": "w",
              "resources": [{ "title": "Docs", "url": "https://docs.python.org", "kind": "doc" }],
              "subtasks": [{ "id": "t1-1", "title": "S" }], "doneWhen": "done" }] }] }] }]
    }"#;

    fn errors_for(edit: impl FnOnce(&mut serde_json::Value)) -> String {
        let mut v: serde_json::Value = serde_json::from_str(FIXTURE).unwrap();
        edit(&mut v);
        let roadmap = parse(&v.to_string()).unwrap();
        roadmap.validate().unwrap_err().join("\n")
    }

    fn task(v: &mut serde_json::Value) -> &mut serde_json::Value {
        &mut v["phases"][0]["weeks"][0]["days"][0]["tasks"][0]
    }

    #[test]
    fn valid_fixture_passes() {
        let roadmap = parse(FIXTURE).unwrap();
        assert_eq!(roadmap.validate(), Ok(()));
        assert_eq!(roadmap.task("t1").unwrap().estimate_minutes, 60);
        assert_eq!(roadmap.tasks().count(), 1);
    }

    #[test]
    fn duplicate_ids_rejected() {
        let err = errors_for(|v| {
            let copy = task(v).clone();
            v["phases"][0]["weeks"][0]["days"][0]["tasks"].as_array_mut().unwrap().push(copy);
        });
        assert!(err.contains("duplicate id: t1"), "{err}");

        let err = errors_for(|v| task(v)["subtasks"][0]["id"] = "t1".into());
        assert!(err.contains("duplicate id: t1"), "{err}");
    }

    #[test]
    fn day_outside_week_rejected() {
        let err = errors_for(|v| v["phases"][0]["weeks"][0]["days"][0]["date"] = "2026-11-10".into());
        assert!(err.contains("outside week w1"), "{err}");
    }

    #[test]
    fn unknown_skill_rejected() {
        let err = errors_for(|v| task(v)["skills"][0] = "nope".into());
        assert!(err.contains("unknown skill"), "{err}");
    }

    #[test]
    fn skill_cycle_rejected() {
        let err = errors_for(|v| {
            v["skills"] = serde_json::json!([
                { "id": "python", "name": "P", "description": "d", "requires": ["b"] },
                { "id": "b", "name": "B", "description": "d", "requires": ["python"] }
            ]);
        });
        assert!(err.contains("cycle"), "{err}");
    }

    #[test]
    fn non_https_url_rejected() {
        let err = errors_for(|v| task(v)["resources"][0]["url"] = "http://x".into());
        assert!(err.contains("https"), "{err}");
    }

    #[test]
    fn zero_estimate_rejected() {
        let err = errors_for(|v| task(v)["estimateMinutes"] = 0.into());
        assert!(err.contains("estimate"), "{err}");
    }

    #[test]
    fn empty_done_when_rejected() {
        let err = errors_for(|v| task(v)["doneWhen"] = " ".into());
        assert!(err.contains("doneWhen"), "{err}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn embedded_roadmap_parses_and_has_tasks() {
        let roadmap = parse_value().expect("roadmap.json must be valid JSON");
        let ids = task_ids(&roadmap);
        assert!(ids.contains("w1-setup"));
        assert!(ids.contains("w4-deliverable"));
    }

    fn strings(v: &Value) -> Vec<&str> {
        v.as_array().into_iter().flatten().filter_map(Value::as_str).collect()
    }

    #[test]
    fn skill_references_exist_and_graph_has_no_cycles() {
        let roadmap = parse_value().unwrap();
        let skills = roadmap["skills"].as_array().unwrap();
        let requires: HashMap<&str, Vec<&str>> = skills
            .iter()
            .map(|s| (s["id"].as_str().unwrap(), strings(&s["requires"])))
            .collect();

        for (skill, reqs) in &requires {
            for req in reqs {
                assert!(requires.contains_key(req), "skill {skill} requires unknown skill {req}");
            }
        }
    }
}
