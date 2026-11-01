// AI coach: builds prompts from the roadmap and progress, calls the Claude Messages API
// over HTTP (there is no official Rust SDK) and parses structured JSON answers.

use std::{collections::BTreeMap, time::Duration};

use chrono::{DateTime, Local, NaiveDate, Utc};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};

use crate::progress::Streak;

const API_URL: &str = "https://api.anthropic.com/v1/messages";
const API_VERSION: &str = "2026-10-21";
const MODEL: &str = "claude-opus-5-5";
// If a safety classifier declines a request, the API retries it on a recommended model.
const FALLBACK_BETA: &str = "server-side-fallback-2026-07-01";
const QUIZ_SIZE: usize = 5;
const OPTIONS_PER_QUESTION: usize = 4;

const REVIEW_SYSTEM: &str = "Eres el coach de estudio de una persona que se prepara para un \
bootcamp de AI Engineering. Recibes su roadmap, qué tareas ha completado y cuándo, su racha y la \
fecha de hoy. Responde en español, en tono cercano y directo, sin relleno ni frases motivacionales \
vacías.\n\
- summary: 2-3 frases sobre cómo va respecto al calendario de las semanas (compara sus fechas con \
la de hoy) y qué ha avanzado.\n\
- advice: un consejo concreto y accionable para los próximos días.\n\
- nextTaskIds: hasta 3 ids de tareas pendientes, en el orden en que conviene hacerlas, copiados \
exactamente del roadmap.";

const QUIZ_SYSTEM: &str = "Eres un profesor que examina a una persona que se prepara para un \
bootcamp de AI Engineering. Genera exactamente 5 preguntas tipo test sobre la habilidad indicada, \
al nivel de sus tareas: prioriza lo que cubren las tareas completadas y, si no hay ninguna, usa un \
nivel introductorio. Cada pregunta tiene exactamente 4 opciones y una sola correcta; answerIndex es \
su posición (0-3) y conviene variarla entre preguntas. explanation dice en 1-2 frases por qué esa \
es la correcta. Pregunta por comprensión, no por memoria de detalles triviales. Escribe en \
español; deja en inglés los términos técnicos que se usan así.";

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Review {
    pub summary: String,
    pub advice: String,
    pub next_task_ids: Vec<String>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Question {
    pub question: String,
    pub options: Vec<String>,
    pub answer_index: usize,
    pub explanation: String,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub struct Quiz {
    pub questions: Vec<Question>,
}

fn review_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "summary": { "type": "string" },
            "advice": { "type": "string" },
            "nextTaskIds": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["summary", "advice", "nextTaskIds"],
        "additionalProperties": false
    })
}

fn quiz_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question": { "type": "string" },
                        "options": { "type": "array", "items": { "type": "string" } },
                        "answerIndex": { "type": "integer" },
                        "explanation": { "type": "string" }
                    },
                    "required": ["question", "options", "answerIndex", "explanation"],
                    "additionalProperties": false
                }
            }
        },
        "required": ["questions"],
        "additionalProperties": false
    })
}

fn tasks_by_week(roadmap: &Value) -> Vec<(&Value, Vec<&Value>)> {
    fn arr<'a>(v: &'a Value, k: &str) -> Vec<&'a Value> {
        v[k].as_array().map(|a| a.iter().collect()).unwrap_or_default()
    }
    arr(roadmap, "phases")
        .into_iter()
        .flat_map(|phase| arr(phase, "weeks"))
        .map(|week| (week, arr(week, "tasks")))
        .collect()
}

/// Plain-text view of the roadmap and progress that the coach reads.
pub fn progress_context(
    roadmap: &Value,
    completed: &BTreeMap<String, DateTime<Utc>>,
    streak: &Streak,
    today: NaiveDate,
) -> String {
    let mut out = format!(
        "Fecha de hoy: {today}\nObjetivo: {}\nRacha actual: {} días (récord: {})\n",
        roadmap["goal"].as_str().unwrap_or(""),
        streak.current,
        streak.longest,
    );
    for (week, tasks) in tasks_by_week(roadmap) {
        out += &format!(
            "\n## Semana {}: {} ({} a {})\n",
            week["number"], week["title"].as_str().unwrap_or(""),
            week["start"].as_str().unwrap_or("?"), week["end"].as_str().unwrap_or("?"),
        );
        for task in tasks {
            let id = task["id"].as_str().unwrap_or("");
            let title = task["title"].as_str().unwrap_or("");
            match completed.get(id) {
                Some(at) => out += &format!("- [x] {id}: {title} (completada el {})\n", at.with_timezone(&Local).date_naive()),
                None => out += &format!("- [ ] {id}: {title}\n"),
            }
        }
    }
    out
}

/// The skill's name plus its tasks, or None if the skill does not exist.
pub fn skill_context(roadmap: &Value, completed: &BTreeMap<String, DateTime<Utc>>, skill_id: &str) -> Option<String> {
    let skill = roadmap["skills"].as_array()?.iter().find(|s| s["id"] == skill_id)?;
    let mut out = format!("Habilidad: {}\nTareas de esta habilidad:\n", skill["name"].as_str().unwrap_or(skill_id));
    for (_, tasks) in tasks_by_week(roadmap) {
        for task in tasks.into_iter().filter(|t| t["skills"].as_array().is_some_and(|s| s.iter().any(|x| x == skill_id))) {
            let id = task["id"].as_str().unwrap_or("");
            let mark = if completed.contains_key(id) { "x" } else { " " };
            out += &format!("- [{mark}] {}\n", task["title"].as_str().unwrap_or(""));
        }
    }
    Some(out)
}

/// Keeps only suggested tasks that exist and are still pending, in the coach's order.
pub fn clean_review(mut review: Review, roadmap: &Value, completed: &BTreeMap<String, DateTime<Utc>>) -> Review {
    let pending: Vec<&str> = tasks_by_week(roadmap)
        .into_iter()
        .flat_map(|(_, tasks)| tasks)
        .filter_map(|t| t["id"].as_str())
        .filter(|id| !completed.contains_key(*id))
        .collect();
    review.next_task_ids.retain(|id| pending.contains(&id.as_str()));
    review.next_task_ids.dedup();
    review.next_task_ids.truncate(3);
    review
}

/// Drops malformed questions; fails if nothing usable is left.
pub fn clean_quiz(mut quiz: Quiz) -> Result<Quiz, String> {
    quiz.questions
        .retain(|q| q.options.len() == OPTIONS_PER_QUESTION && q.answer_index < OPTIONS_PER_QUESTION);
    quiz.questions.truncate(QUIZ_SIZE);
    if quiz.questions.is_empty() {
        return Err("El coach no devolvió preguntas válidas. Prueba otra vez.".into());
    }
    Ok(quiz)
}

pub fn review_request(context: &str) -> Value {
    request_body(REVIEW_SYSTEM, context, review_schema())
}

pub fn quiz_request(context: &str) -> Value {
    request_body(QUIZ_SYSTEM, context, quiz_schema())
}

fn request_body(system: &str, user: &str, schema: Value) -> Value {
    json!({
        "model": MODEL,
        "max_tokens": 16000,
        "fallbacks": "default",
        "output_config": {
            "effort": "medium",
            "format": { "type": "json_schema", "schema": schema }
        },
        "system": system,
        "messages": [{ "role": "user", "content": user }]
    })
}

/// Turns an HTTP status and body from the Messages API into the parsed answer or a readable error.
pub fn parse_response<T: DeserializeOwned>(status: u16, body: &str) -> Result<T, String> {
    let json: Value = serde_json::from_str(body).map_err(|_| format!("Respuesta inesperada de la API (HTTP {status})."))?;

    if status != 200 {
        let message = json["error"]["message"].as_str().unwrap_or("sin detalles");
        return Err(match status {
            401 => "La clave de API no es válida. Revísala en la pestaña Coach.".into(),
            403 => format!("La clave no tiene permiso para esta petición: {message}"),
            429 => "Has llegado al límite de uso de la API. Prueba en un rato.".into(),
            500..=599 => "El servicio de Claude está saturado o caído. Prueba en un rato.".into(),
            _ => format!("La API rechazó la petición (HTTP {status}): {message}"),
        });
    }

    match json["stop_reason"].as_str() {
        Some("refusal") => return Err("Claude ha rechazado esta petición.".into()),
        Some("max_tokens") => return Err("La respuesta se cortó por ser demasiado larga. Prueba otra vez.".into()),
        _ => {}
    }

    // With adaptive thinking the content can start with thinking blocks; the answer is the text block.
    let text = json["content"]
        .as_array()
        .and_then(|blocks| blocks.iter().rev().find(|b| b["type"] == "text"))
        .and_then(|b| b["text"].as_str())
        .ok_or("La respuesta de la API no trae texto.")?;

    serde_json::from_str(text).map_err(|e| format!("La respuesta del coach no tiene el formato esperado: {e}"))
}

pub async fn ask<T: DeserializeOwned>(api_key: &str, body: &Value) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|e| format!("No se pudo preparar la conexión: {e}"))?;

    let response = client
        .post(API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", API_VERSION)
        .header("anthropic-beta", FALLBACK_BETA)
        .json(body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "El coach ha tardado demasiado en responder. Prueba otra vez.".to_string()
            } else {
                "No se pudo conectar con la API de Claude. ¿Tienes conexión a internet?".to_string()
            }
        })?;

    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| format!("No se pudo leer la respuesta: {e}"))?;
    parse_response(status, &body)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roadmap() -> Value {
        json!({
            "goal": "Llegar al bootcamp",
            "skills": [{ "id": "python", "name": "Python", "requires": [] }],
            "phases": [{ "weeks": [{
                "number": 1, "title": "Python", "start": "2026-11-02", "end": "2026-11-08",
                "tasks": [
                    { "id": "t1", "title": "Instalar Python", "skills": ["python"] },
                    { "id": "t2", "title": "Funciones", "skills": ["python"] },
                    { "id": "t3", "title": "Git", "skills": [] }
                ]
            }]}]
        })
    }

    fn done(ids: &[&str]) -> BTreeMap<String, DateTime<Utc>> {
        ids.iter().map(|id| (id.to_string(), Utc::now())).collect()
    }

    fn api_text(text: &str) -> String {
        json!({
            "stop_reason": "end_turn",
            "content": [{ "type": "thinking", "thinking": "" }, { "type": "text", "text": text }]
        })
        .to_string()
    }

    #[test]
    fn context_marks_done_and_pending_tasks() {
        let streak = Streak { current: 2, longest: 4, studied_today: true };
        let today = NaiveDate::from_ymd_opt(2026, 11, 3).unwrap();
        let text = progress_context(&roadmap(), &done(&["t1"]), &streak, today);
        assert!(text.contains("Fecha de hoy: 2026-11-03"));
        assert!(text.contains("Racha actual: 2 días (récord: 4)"));
        assert!(text.contains("- [x] t1: Instalar Python"));
        assert!(text.contains("- [ ] t2: Funciones"));
    }

    #[test]
    fn skill_context_lists_only_that_skill() {
        let text = skill_context(&roadmap(), &done(&["t2"]), "python").unwrap();
        assert!(text.contains("Habilidad: Python"));
        assert!(text.contains("- [x] Funciones"));
        assert!(!text.contains("Git"));
        assert!(skill_context(&roadmap(), &done(&[]), "nope").is_none());
    }

    #[test]
    fn review_keeps_only_real_pending_tasks() {
        let review = Review {
            summary: "s".into(),
            advice: "a".into(),
            next_task_ids: vec!["t1".into(), "made-up".into(), "t3".into(), "t2".into()],
        };
        let cleaned = clean_review(review, &roadmap(), &done(&["t1"]));
        assert_eq!(cleaned.next_task_ids, ["t3", "t2"]);
    }

    #[test]
    fn parses_structured_text_after_thinking() {
        let body = api_text(r#"{"summary":"Vas bien","advice":"Sigue","nextTaskIds":["t2"]}"#);
        let review: Review = parse_response(200, &body).unwrap();
        assert_eq!(review.summary, "Vas bien");
        assert_eq!(review.next_task_ids, ["t2"]);
    }

    #[test]
    fn quiz_drops_malformed_questions() {
        let q = |options: usize, answer: usize| Question {
            question: "q".into(),
            options: vec!["o".into(); options],
            answer_index: answer,
            explanation: "e".into(),
        };
        let quiz = clean_quiz(Quiz { questions: vec![q(4, 1), q(3, 0), q(4, 7)] }).unwrap();
        assert_eq!(quiz.questions.len(), 1);
        assert!(clean_quiz(Quiz { questions: vec![q(2, 0)] }).is_err());
    }

    #[test]
    fn maps_api_errors_to_readable_messages() {
        let err = |status| {
            let body = json!({ "type": "error", "error": { "type": "x", "message": "detalle" } }).to_string();
            parse_response::<Review>(status, &body).unwrap_err()
        };
        assert!(err(401).contains("clave de API no es válida"));
        assert!(err(429).contains("límite de uso"));
        assert!(err(529).contains("saturado"));
        assert!(err(400).contains("detalle"));
    }

    #[test]
    fn refusal_is_an_error() {
        let body = json!({ "stop_reason": "refusal", "content": [] }).to_string();
        assert!(parse_response::<Review>(200, &body).unwrap_err().contains("rechazado"));
    }

    #[test]
    fn request_uses_structured_output_and_fallbacks() {
        let body = review_request("ctx");
        assert_eq!(body["model"], MODEL);
        assert_eq!(body["fallbacks"], "default");
        assert_eq!(body["output_config"]["format"]["type"], "json_schema");
        assert_eq!(body["messages"][0]["content"], "ctx");
    }
}
