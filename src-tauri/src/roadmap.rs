use std::collections::HashSet;

use serde_json::Value;

// Seed data is read-only, so it is embedded in the binary at compile time.
// Cargo rebuilds automatically when data/roadmap.json changes.
const ROADMAP_JSON: &str = include_str!("../../data/roadmap.json");

pub fn parse() -> serde_json::Result<Value> {
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
mod tests {
    use super::*;

    #[test]
    fn embedded_roadmap_parses_and_has_tasks() {
        let roadmap = parse().expect("roadmap.json must be valid JSON");
        let ids = task_ids(&roadmap);
        assert!(ids.contains("w1-setup"));
        assert!(ids.contains("w4-deliverable"));
    }
}
