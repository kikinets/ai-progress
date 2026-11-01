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
    use std::collections::HashMap;

    #[test]
    fn embedded_roadmap_parses_and_has_tasks() {
        let roadmap = parse().expect("roadmap.json must be valid JSON");
        let ids = task_ids(&roadmap);
        assert!(ids.contains("w1-setup"));
        assert!(ids.contains("w4-deliverable"));
    }

    fn strings(v: &Value) -> Vec<&str> {
        v.as_array().into_iter().flatten().filter_map(Value::as_str).collect()
    }

    #[test]
    fn skill_references_exist_and_graph_has_no_cycles() {
        let roadmap = parse().unwrap();
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

        let tasks = roadmap["phases"].as_array().unwrap().iter()
            .flat_map(|p| p["weeks"].as_array().unwrap())
            .flat_map(|w| w["tasks"].as_array().unwrap());
        for task in tasks {
            for skill in strings(&task["skills"]) {
                assert!(requires.contains_key(skill), "task {} uses unknown skill {skill}", task["id"]);
            }
        }

        // Depth-first search: reaching a skill that is still on the current path means a cycle.
        fn visit<'a>(id: &'a str, graph: &HashMap<&'a str, Vec<&'a str>>, path: &mut Vec<&'a str>, done: &mut HashSet<&'a str>) {
            if done.contains(id) {
                return;
            }
            assert!(!path.contains(&id), "cycle in skills: {path:?} -> {id}");
            path.push(id);
            for req in &graph[id] {
                visit(req, graph, path, done);
            }
            path.pop();
            done.insert(id);
        }
        let mut done = HashSet::new();
        for id in requires.keys() {
            visit(id, &requires, &mut Vec::new(), &mut done);
        }
    }
}
