// AI coach: builds prompts from the roadmap and progress, calls the Claude Messages API
// over HTTP (there is no official Rust SDK) and parses structured JSON answers.

use std::time::Duration;

use chrono::{Local, NaiveDate};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};

use crate::progress::{Progress, ProgressView};
use crate::roadmap::Roadmap;

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

// Free mode: the same context goes to the clipboard and the user pastes it into claude.ai.
const REVIEW_CHAT: &str = "Eres mi coach de estudio. Me preparo para un bootcamp de AI \
Engineering. Abajo tienes mi roadmap, qué tareas he completado y cuándo, mi racha y la fecha de \
hoy. Respóndeme en español, en tono cercano y directo, sin relleno:\n\
1. Cómo voy respecto al calendario de las semanas (2-3 frases).\n\
2. Un consejo concreto y accionable para los próximos días.\n\
3. Hasta 3 tareas pendientes que haría a continuación, en orden.";

const QUIZ_CHAT: &str = "Eres un profesor que me examina. Me preparo para un bootcamp de AI \
Engineering. Hazme un examen de 5 preguntas tipo test sobre la habilidad de abajo, al nivel de \
sus tareas: prioriza lo que cubren las que he completado ([x]) y, si no hay ninguna, usa un nivel \
introductorio. Cada pregunta con 4 opciones (A-D) y una sola correcta. Pregunta por comprensión, \
no por detalles triviales.\n\
Hazme las preguntas de una en una: espera mi respuesta, dime si he acertado con una explicación \
breve y pasa a la siguiente. Al final, dame mi nota y qué debería repasar. Escribe en español; deja \
en inglés los términos técnicos que se usan así.";

/// Ready-to-paste text for claude.ai: instructions first, then the data.
pub fn chat_prompt(instructions: &str, context: &str) -> String {
    format!("{instructions}\n\n---\n\n{context}")
}

pub fn review_chat_prompt(context: &str) -> String {
    chat_prompt(REVIEW_CHAT, context)
}

pub fn quiz_chat_prompt(context: &str) -> String {
    chat_prompt(QUIZ_CHAT, context)
}

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

fn is_done(p: &Progress, id: &str) -> bool {
    p.tasks.get(id).is_some_and(|t| t.completed_at.is_some())
}

/// Plain-text view of the roadmap and progress that the coach reads.
/// Notes are only flagged, never copied: they are the user's private text.
pub fn progress_context(r: &Roadmap, p: &Progress, view: &ProgressView, today: NaiveDate) -> String {
    let mut out = format!(
        "Fecha de hoy: {today}\nObjetivo: {}\nRacha actual: {} días (récord: {})\nMinutos estudiados en total: {}\n",
        r.goal, view.streak.current, view.streak.longest, view.stats.total_minutes,
    );
    for week in r.phases.iter().flat_map(|ph| &ph.weeks) {
        let minutes: u32 = view
            .stats
            .minutes_by_day
            .iter()
            .filter(|d| d.date >= week.start && d.date <= week.end)
            .map(|d| d.minutes)
            .sum();
        out += &format!(
            "\n## Semana {}: {} ({} a {}), minutos estudiados: {minutes}\n",
            week.number, week.title, week.start, week.end
        );
        for day in &week.days {
            for task in &day.tasks {
                let entry = p.tasks.get(&task.id);
                let mut line = match entry.and_then(|t| t.completed_at) {
                    Some(at) => format!("- [x] {}: {} (completada el {})", task.id, task.title, at.with_timezone(&Local).date_naive()),
                    None if day.date < today => format!("- [ ] {}: {} (atrasada)", task.id, task.title),
                    None => format!("- [ ] {}: {}", task.id, task.title),
                };
                if entry.is_some_and(|t| !t.notes.trim().is_empty()) {
                    line += " (tiene notas)";
                }
                out += &line;
                out.push('\n');
            }
        }
    }
    out
}

/// The skill's name plus its tasks, or None if the skill does not exist.
pub fn skill_context(r: &Roadmap, p: &Progress, skill_id: &str) -> Option<String> {
    let skill = r.skills.iter().find(|s| s.id == skill_id)?;
    let mut out = format!("Habilidad: {}\n{}\nTareas de esta habilidad:\n", skill.name, skill.description);
    for (_, _, task) in r.tasks().filter(|(_, _, t)| t.skills.iter().any(|s| s == skill_id)) {
        let mark = if is_done(p, &task.id) { "x" } else { " " };
        out += &format!("- [{mark}] {}\n", task.title);
    }
    Some(out)
}

/// Keeps only suggested tasks that exist and are still pending, in the coach's order.
pub fn clean_review(mut review: Review, r: &Roadmap, p: &Progress) -> Review {
    review.next_task_ids.retain(|id| r.task(id).is_some() && !is_done(p, id));
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
    use chrono::{DateTime, Utc};

    fn roadmap() -> Roadmap {
        crate::roadmap::load().unwrap()
    }

    fn at(s: &str) -> DateTime<Utc> {
        s.parse().unwrap()
    }

    fn progress(done: &[&str]) -> Progress {
        let mut p = Progress::default();
        for id in done {
            crate::progress::set_task(&mut p, id, true, at("2026-11-02T10:00:00Z"));
        }
        p
    }

    fn context(p: &Progress, today: &str) -> String {
        let r = roadmap();
        let now = format!("{today}T20:00:00+01:00").parse::<DateTime<chrono::FixedOffset>>().unwrap();
        let view = crate::progress::build_view(&r, p, now);
        progress_context(&r, p, &view, now.date_naive())
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
        let text = context(&progress(&["w1-setup"]), "2026-11-03");
        assert!(text.contains("Fecha de hoy: 2026-11-03"), "{text}");
        assert!(text.contains("Racha actual: 1 días (récord: 1)"), "{text}");
        assert!(text.contains("- [x] w1-setup: Instalar Python"), "{text}");
        assert!(text.contains("- [ ] w1-basics: Tipos"), "{text}");
    }

    #[test]
    fn context_includes_week_minutes_and_overdue() {
        let mut p = progress(&[]);
        p.sessions.push(crate::progress::store::Session {
            task_id: "w1-setup".into(),
            start: at("2026-11-02T09:00:00Z"),
            end: at("2026-11-02T09:50:00Z"),
            minutes: 50,
            mode: crate::progress::TimerMode::Free,
        });
        let text = context(&p, "2026-11-03");
        assert!(text.contains("minutos estudiados: 50"), "{text}");
        assert!(text.contains("- [ ] w1-setup: Instalar Python 3.12+, VS Code, Git y crear cuenta de GitHub (atrasada)"), "{text}");
        assert!(!text.contains("w1-basics: Tipos, listas, diccionarios, sets, comprehensions, f-strings (atrasada)"), "{text}");
    }

    #[test]
    fn context_flags_notes_without_content() {
        let mut p = progress(&[]);
        crate::progress::set_notes(&mut p, "w1-venv", "secreto".into()).unwrap();
        let text = context(&p, "2026-11-01");
        assert!(text.contains("(tiene notas)"), "{text}");
        assert!(!text.contains("secreto"), "{text}");
    }

    #[test]
    fn skill_context_lists_only_that_skill() {
        let r = roadmap();
        let text = skill_context(&r, &progress(&["w2-sql"]), "sql").unwrap();
        assert!(text.contains("Habilidad: SQL"), "{text}");
        assert!(text.contains("- [x] SQL básico"), "{text}");
        assert!(!text.contains("NumPy"), "{text}");
        assert!(skill_context(&r, &progress(&[]), "nope").is_none());
    }

    #[test]
    fn review_keeps_only_real_pending_tasks() {
        let review = Review {
            summary: "s".into(),
            advice: "a".into(),
            next_task_ids: vec!["w1-setup".into(), "made-up".into(), "w1-git".into(), "w1-venv".into(), "w1-basics".into()],
        };
        let cleaned = clean_review(review, &roadmap(), &progress(&["w1-setup"]));
        assert_eq!(cleaned.next_task_ids, ["w1-git", "w1-venv", "w1-basics"]);
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
    fn chat_prompts_put_instructions_before_data() {
        let prompt = quiz_chat_prompt("Habilidad: Python");
        let instructions = prompt.find("de una en una").unwrap();
        let data = prompt.find("Habilidad: Python").unwrap();
        assert!(instructions < data);
        assert!(review_chat_prompt("ctx").ends_with("ctx"));
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
